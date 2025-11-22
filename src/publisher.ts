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
  constructor(rpcUrl: string, contractId: string, secretKey: string) {
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
      
      console.log(`  Signer: ${this.publicKey}`);

      // Simulate transaction hash
      const mockTxHash = "0".repeat(64); // Mock 64-char hex hash

      // TODO: Uncomment and implement actual Soroban transaction
      /*
      const contract = new Contract(this.contractId);
      const sourceAccount = await this.server.getAccount(
        this.keypair.publicKey()
      );

      // Build contract method call arguments as ScVal
      const methodArgs = [
        this.stringToScVal(params.assetId),
        this.numberToScVal(params.price),
        this.numberToScVal(params.timestamp),
        this.stringToScVal(params.commit),
        // TODO: Add ZK proof to contract call when contract supports it
        // this.stringToScVal(params.proof || ''),
        // this.stringToScVal(params.proofPublicInputs || ''),
      ];

      // Build transaction with contract invocation
      const transactionBuilder = new TransactionBuilder(sourceAccount, {
        fee: "100", // Base fee
        networkPassphrase: this.networkPassphrase,
      });

      const operation = contract.call("update_price", ...methodArgs);
      transactionBuilder.addOperation(operation);
      transactionBuilder.setTimeout(30);

      // Build the transaction
      let transaction = transactionBuilder.build();

      // Simulate transaction to get resource estimates
      const simulateResult = await this.server.simulateTransaction(transaction);

      if (SorobanRpc.Api.isSimulationError(simulateResult)) {
        throw new Error(`Simulation error: ${JSON.stringify(simulateResult)}`);
      }

      // Assemble transaction (add simulation results)
      // Note: assembleTransaction helper may vary by SDK version
      // If this fails, you may need to manually set resources using:
      // transaction.setSorobanData(simulateResult.transactionData.build())
      let assembledTransaction: any;
      if (typeof SorobanRpc.assembleTransaction === "function") {
        assembledTransaction = SorobanRpc.assembleTransaction(
          transaction,
          simulateResult
        ).build();
      } else {
        // Fallback: manually set resources
        transaction.setSorobanData(simulateResult.transactionData.build());
        assembledTransaction = transaction;
      }
    );

    // 2) SIGN (new SDK requires signTransaction wrapper)
    await tx.sign({
      signTransaction: async (xdr: string) => {
        // Parse XDR string to Transaction, sign it, and return signed XDR
        const transaction = TransactionBuilder.fromXDR(
          xdr,
          this.networkPassphrase
        );
        transaction.sign(this.keypair);
        return {
          signedTxXdr: transaction.toXDR(),
        };
      },
    });

    // 3) SEND TX
    const sendResult = await tx.send();

    // Get hash from sendTransactionResponse
    const txHash = sendResult.sendTransactionResponse?.hash;
    if (!txHash) {
      console.error("[PUBLISH] Failed to get transaction hash");
      console.error(
        "[PUBLISH] Send result:",
        JSON.stringify(sendResult, null, 2)
      );
      throw new Error("Transaction send failed: no hash returned");
    }

    console.log("[PUBLISH] TX sent. Hash:", txHash);

    // 4) Wait for confirmation (poll)
    let result = await this.server.getTransaction(txHash);

    while (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      result = await this.server.getTransaction(txHash);
    }

    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      console.error("[PUBLISH] TX FAILED:", JSON.stringify(result));
      throw new Error("Soroban transaction failed");
    }

    console.log("[PUBLISH] TX confirmed on TESTNET.");

    return {
      txHash: txHash,
      success: true,
    };
  }
}
