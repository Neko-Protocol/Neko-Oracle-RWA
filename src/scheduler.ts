import * as cron from "node-cron";
import { PriceFetcher, PriceData, DualPriceData } from "./fetcher";
import { generateCommit, generateCommitWithProof, debugCommitInputs } from "./commit";
import { SorobanPublisher, PublishParams } from "./publisher";

export interface SchedulerConfig {
  priceFetcher: PriceFetcher;
  publisher: SorobanPublisher;
  cronExpression?: string;
  intervalSeconds?: number; // Alternative to cron: interval in seconds
  logLevel?: string;
  useZKProof?: boolean; // Enable ZK proof verification (default: true)
}

export class OracleScheduler {
  private priceFetcher: PriceFetcher;
  private publisher: SorobanPublisher;
  private cronExpression: string | null;
  private intervalSeconds: number | null;
  private logLevel: string;
  private useZKProof: boolean;
  private cronJob: cron.ScheduledTask | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: SchedulerConfig) {
    this.priceFetcher = config.priceFetcher;
    this.publisher = config.publisher;
    this.cronExpression = config.cronExpression || null;
    this.intervalSeconds = config.intervalSeconds || null;
    this.logLevel = config.logLevel || "info";
    this.useZKProof = config.useZKProof !== false; // Default to true
  }

  /**
   * Execute a single update cycle: fetch → commit → publish
   * @returns Object with transaction hash and price data
   */
  async executeUpdate(): Promise<{
    txHash: string;
    price: number;
    timestamp: number;
    assetId: string;
    commit: string;
  }> {
    try {
      this.log("info", "Starting price update cycle...");

      if (this.useZKProof) {
        // ZK Proof-verified workflow
        this.log("debug", "Fetching prices from both APIs...");
        const dualPrices: DualPriceData = await this.priceFetcher.fetchBothPrices();
        
        this.log(
          "info",
          `Prices fetched - API1: ${dualPrices.price1.price / 1e7}, API2: ${dualPrices.price2.price / 1e7} for ${dualPrices.price1.assetId}`
        );

        // Use the average timestamp from both APIs
        const timestamp = Math.floor((dualPrices.price1.timestamp + dualPrices.price2.timestamp) / 2);

        // Generate commitment with ZK proof verification
        this.log("debug", "Generating ZK proof and commitment...");
        const commitWithProof = await generateCommitWithProof(
          dualPrices,
          timestamp,
          dualPrices.price1.assetId
        );

        this.log("info", `ZK Proof verified! Average price: ${commitWithProof.verifiedPrice / 1e7}`);
        this.log("info", `Commitment generated: ${commitWithProof.commitment}`);

        // Publish to Oracle with ZK proof
        this.log("debug", "Publishing to Soroban contract with ZK proof...");
        const publishParams: PublishParams = {
          assetId: commitWithProof.assetId,
          price: commitWithProof.verifiedPrice,
          timestamp: commitWithProof.timestamp,
          commit: commitWithProof.commitment,
          proof: commitWithProof.proof.proofHex,
          proofPublicInputs: commitWithProof.proof.publicInputsHex,
        };
        const result = await this.publisher.publishToOracle(publishParams);

        if (result.success) {
          this.log("info", `Price update successful! TX: ${result.txHash}`);
          return {
            txHash: result.txHash,
            price: commitWithProof.verifiedPrice,
            timestamp: commitWithProof.timestamp,
            assetId: commitWithProof.assetId,
            commit: commitWithProof.commitment,
          };
        } else {
          throw new Error("Publish returned success=false");
        }
      } else {
        // Legacy workflow without ZK proof (fallback)
        this.log("debug", "Fetching price data (legacy mode)...");
        const priceData: PriceData = await this.priceFetcher.fetchPrice();
        this.log(
          "info",
          `Price fetched: ${priceData.price / 1e7} for ${priceData.assetId}`
        );

        // Generate commitment
        this.log("debug", "Generating commitment...");
        if (this.logLevel === "debug") {
          debugCommitInputs(
            priceData.price,
            priceData.timestamp,
            priceData.assetId
          );
        }
        const commit = await generateCommit(
          priceData.price,
          priceData.timestamp,
          priceData.assetId
        );
        this.log("info", `Commitment generated: ${commit}`);

        // Publish to Oracle
        this.log("debug", "Publishing to Soroban contract...");
        const publishParams: PublishParams = {
          assetId: priceData.assetId,
          price: priceData.price,
          timestamp: priceData.timestamp,
          commit,
        };
        const result = await this.publisher.publishToOracle(publishParams);

        if (result.success) {
          this.log("info", `Price update successful! TX: ${result.txHash}`);
          return {
            txHash: result.txHash,
            price: priceData.price,
            timestamp: priceData.timestamp,
            assetId: priceData.assetId,
            commit,
          };
        } else {
          throw new Error("Publish returned success=false");
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null
          ? JSON.stringify(error, null, 2)
          : String(error);

      this.log("error", `Price update failed: ${errorMessage}`);

      if (error instanceof Error) {
        if (this.logLevel === "debug") {
          console.error(error.stack);
        }
      } else {
        console.error("Error details:", error);
      }
      throw error;
    }
  }

  /**
   * Start the scheduler (cron or interval based)
   */
  start(): void {
    if (this.cronJob || this.intervalId) {
      this.log("warn", "Scheduler is already running");
      return;
    }

    // Use interval in seconds if provided (for testing)
    if (this.intervalSeconds && this.intervalSeconds > 0) {
      this.log(
        "info",
        `Starting scheduler with interval: ${this.intervalSeconds} seconds`
      );

      this.intervalId = setInterval(async () => {
        await this.executeUpdate();
      }, this.intervalSeconds * 1000);

      // Execute immediately on start (optional)
      this.executeUpdate().catch((error) => {
        this.log(
          "error",
          `Initial update failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });
    } else if (this.cronExpression) {
      // Use cron expression if provided
      this.log(
        "info",
        `Starting scheduler with cron expression: ${this.cronExpression}`
      );

      this.cronJob = cron.schedule(this.cronExpression, async () => {
        await this.executeUpdate();
      });

      // Execute immediately on start (optional)
      this.executeUpdate().catch((error) => {
        this.log(
          "error",
          `Initial update failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });
    } else {
      this.log("error", "No cron expression or interval specified");
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.log("info", "Scheduler stopped (cron)");
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.log("info", "Scheduler stopped (interval)");
    }
  }

  /**
   * Log message based on log level
   */
  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (level === "error") {
      console.error(logMessage);
    } else if (level === "warn") {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }
}
