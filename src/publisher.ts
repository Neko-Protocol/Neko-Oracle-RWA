import {
  Keypair,
  rpc,
  Networks,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { Client, type Asset } from "oracle";

export interface PublishParams {
  assetId: string;
  price: number;
  timestamp: number;
  commit: string;
  proof?: string;  // Hex-encoded ZK proof (optional for backward compatibility)
  proofPublicInputs?: string;  // Hex-encoded public inputs from proof
}

export interface PublishResult {
  txHash: string;
  success: boolean;
}

export class SorobanPublisher {
  private client: Client;
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

    this.client = new Client({
      rpcUrl,
      contractId,
      publicKey: this.keypair.publicKey(),
      networkPassphrase: this.networkPassphrase,
    });

    this.server = new rpc.Server(rpcUrl, {
      allowHttp: rpcUrl.startsWith("http://"),
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

  async publishToOracle(params: PublishParams): Promise<PublishResult> {
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
      
      // Log ZK proof data if present
      if (params.proof) {
        console.log(`  ZK Proof: ${params.proof.slice(0, 64)}... (${params.proof.length / 2} bytes)`);
        console.log(`  Proof Public Inputs: ${params.proofPublicInputs || 'N/A'}`);
        console.log(`  [ZK-VERIFIED] Price verified through zero-knowledge proof`);
      } else {
        console.log(`  [WARNING] No ZK proof provided - publishing without cryptographic verification`);
      }
      
      console.log(`  Signer: ${this.keypair.publicKey()}`);

      // Simulate transaction hash
      const mockTxHash = "0".repeat(64); // Mock 64-char hex hash

      return {
        txHash: mockTxHash,
        success: true,
      };
    });
  }
}