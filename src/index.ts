import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { PriceFetcher } from "./fetcher";
import { SorobanPublisher } from "./publisher";
import { OracleScheduler } from "./scheduler";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "API_KEY",
  "FINNHUB_API_KEY",
  "ASSET_ID",
  "SOROBAN_RPC",
  "ORACLE_CONTRACT_ID",
  "ORACLE_SECRET_KEY",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVars.join(", ")}`
  );
  console.error("Please check your .env file");
  process.exit(1);
}

// Initialize components
const priceFetcher = new PriceFetcher(
  process.env.API_KEY!,
  process.env.ASSET_ID!,
  process.env.FINNHUB_API_KEY!,
);

const publisher = new SorobanPublisher(
  process.env.SOROBAN_RPC!,
  process.env.ORACLE_CONTRACT_ID!,
  process.env.ORACLE_SECRET_KEY!
);

const scheduler = new OracleScheduler({
  priceFetcher,
  publisher,
  // Run every 5 minutes (300 seconds)
  intervalSeconds: 300,
  // Alternative: use cron expression every 5 minutes
  // cronExpression: "*/5 * * * *", // Every 5 minutes
  logLevel: process.env.LOG_LEVEL || "info",
});

// Express app for force-update endpoint
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

/**
 * Force update endpoint
 * GET /force-update
 * Manually triggers a price update cycle
 * Returns JSON with txHash
 */
app.get("/force-update", async (req: Request, res: Response) => {
  try {
    console.log("[FORCE-UPDATE] Manual update requested");

    // Execute update cycle
    const result = await scheduler.executeUpdate();

    res.json({
      success: true,
      txHash: result.txHash,
      price: result.price / 1e7, // Convert back to readable format
      timestamp: result.timestamp,
      assetId: result.assetId,
      commit: result.commit,
      timestamp_iso: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[FORCE-UPDATE] Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Health check endpoint
 */
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
  console.log(`   Force update: GET http://localhost:${PORT}/force-update`);
  console.log(`   Health check: GET http://localhost:${PORT}/health`);
});

// Start scheduler
console.log("Oracle Feeder starting...");
scheduler.start();
console.log("Oracle Feeder running...");

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  scheduler.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down gracefully...");
  scheduler.stop();
  process.exit(0);
});
