import {
  Keypair,
  rpc,
  Networks,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { Client as OracleClient, Asset } from "oracle";

type OracleModule = typeof import("oracle");

const loadOracleModule = (() => {
  let cached: Promise<OracleModule> | null = null;
  return () => {
    if (!cached) {
      cached = new Function("return import('oracle')")() as Promise<OracleModule>;
    }
    return cached;
  };
})();

export interface PublishParams {
  assetId: string;
  price: number;
  timestamp: number;
  commit: string;
}

export interface PublishResult {
  txHash: string;
  success: boolean;
}

export class SorobanPublisher {
  private client?: OracleClient;
  private clientPromise: Promise<OracleClient>;
  private server: rpc.Server;
  private keypair: Keypair;
  private networkPassphrase: string;
  private contractId: string;
  private rpcUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(rpcUrl: string, contractId: string, secretKey: string) {
    this.rpcUrl = rpcUrl;
    this.contractId = contractId;
    this.keypair = Keypair.fromSecret(secretKey);

    this.networkPassphrase = rpcUrl.includes("testnet")
      ? Networks.TESTNET
      : Networks.FUTURENET; // fallback

    this.server = new rpc.Server(rpcUrl, {
      allowHttp: rpcUrl.startsWith("http://"),
    });

    this.clientPromise = loadOracleModule()
      .then(({ Client }) => {
        const client = new Client({
          contractId,
          rpcUrl,
          networkPassphrase: this.networkPassphrase,
          allowHttp: rpcUrl.startsWith("http://"),
          publicKey: this.keypair.publicKey(),
          signTransaction: this.createTransactionSigner(),
          server: this.server,
        });
        this.client = client;
        return client;
      })
      .catch((error) => {
        console.error("[PUBLISHER] Failed to initialize oracle contract client", error);
        throw error;
      });

    console.log("[PUBLISHER] Running in TESTNET");
    console.log("[PUBLISHER] Contract:", contractId);
    console.log("[PUBLISHER] Feeder wallet:", this.keypair.publicKey());
  }

  // Convert "TSLA" to Asset enum
  private toAsset(assetId: string): Asset {
    return { tag: "Other", values: [assetId] };
  }

  /**
   * Retry wrapper for API calls
   */
  private async retry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      console.warn(`Retry attempt ${this.maxRetries - retries + 1}/${this.maxRetries}`);
      await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      return this.retry(fn, retries - 1);
    }
  }

  private async getClient(): Promise<OracleClient> {
    if (this.client) {
      return this.client;
    }
    return this.clientPromise;
  }

  private createTransactionSigner() {
    return async (xdr: string, opts?: { networkPassphrase?: string }) => {
      const passphrase = opts?.networkPassphrase ?? this.networkPassphrase;
      const tx = TransactionBuilder.fromXDR(xdr, passphrase);
      tx.sign(this.keypair);
      return {
        signedTxXdr: tx.toXDR(),
        signerAddress: this.keypair.publicKey(),
      };
    };
  }

  async publishToOracle(params: PublishParams): Promise<PublishResult> {
    const client = await this.getClient();

    return this.retry(async () => {
      // Log the data that would be published
      console.log("[PUBLISHER] Would publish to Oracle contract:");
      console.log(`  Contract ID: ${this.contractId}`);
      console.log(`  RPC URL: ${this.rpcUrl}`);
      console.log(`  Network: ${this.networkPassphrase}`);
      console.log(`  Asset ID: ${params.assetId}`);
      console.log(`  Price: ${params.price} (${params.price / 1e7} raw)`);
      console.log(
        `  Timestamp: ${params.timestamp} (${new Date(
          params.timestamp * 1000
        ).toISOString()})`
      );
      console.log(`  Commit: ${params.commit}`);
      console.log(`  Signer: ${this.keypair.publicKey()}`);

      const assembledTx = await client.set_asset_price({
        asset_id: this.toAsset(params.assetId),
        price: BigInt(params.price),
        timestamp: BigInt(params.timestamp),
      });

      console.log("[PUBLISHER] Transaction simulated; signing and submitting...");
      const sentTx = await assembledTx.signAndSend();

      const finalResponse = sentTx.getTransactionResponse;
      if (!finalResponse) {
        throw new Error("Transaction was submitted but no final response was returned");
      }
      if (finalResponse.status !== "SUCCESS") {
        throw new Error(`Transaction completed with status ${finalResponse.status}`);
      }

      const txHash =
        finalResponse.txHash ??
        sentTx.sendTransactionResponse?.hash;

      if (!txHash) {
        throw new Error("Unable to determine transaction hash after submission");
      }

      console.log(`[PUBLISHER] Soroban transaction succeeded: ${txHash}`);

      return {
        txHash,
        success: true,
      };
    });
  }
}
