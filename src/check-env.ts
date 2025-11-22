import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config();

interface EnvVar {
  name: string;
  required: boolean;
  description?: string;
}

const envVars: EnvVar[] = [
  {
    name: "API_KEY",
    required: true,
    description: "AlphaVantage API key",
  },
  {
    name: "FINNHUB_API_KEY",
    required: true,
    description: "Finnhub API key",
  },
  {
    name: "ASSET_ID",
    required: true,
    description: "Asset symbol (e.g., TSLA)",
  },
  {
    name: "SOROBAN_RPC",
    required: true,
    description: "Soroban RPC URL (e.g., https://rpc-futurenet.stellar.org)",
  },
  {
    name: "ORACLE_CONTRACT_ID",
    required: true,
    description: "Soroban oracle contract ID",
  },
  {
    name: "ORACLE_SECRET_KEY",
    required: true,
    description: "Stellar secret key for signing transactions",
  },
  {
    name: "LOG_LEVEL",
    required: false,
    description: "Logging level (default: info)",
  },
  {
    name: "PORT",
    required: false,
    description: "Express server port (default: 3000)",
  },
];

function checkEnvVars(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  console.log("Checking environment variables...\n");

  for (const envVar of envVars) {
    const value = process.env[envVar.name];

    if (!value || value.trim() === "") {
      if (envVar.required) {
        missing.push(envVar.name);
        console.log(`[MISSING] ${envVar.name} - ${envVar.description || "Required"}`);
      } else {
        warnings.push(envVar.name);
        console.log(`[OPTIONAL] ${envVar.name} - ${envVar.description || "Optional"} (not set)`);
      }
    } else {
      // Mask sensitive values
      const displayValue =
        envVar.name.includes("KEY") || envVar.name.includes("SECRET")
          ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
          : value;

      console.log(`[OK] ${envVar.name} = ${displayValue}`);
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}

function checkEnvFile(): boolean {
  const envPath = path.join(process.cwd(), ".env");
  const envExamplePath = path.join(process.cwd(), ".env.example");

  console.log("\nChecking .env file...");

  if (!fs.existsSync(envPath)) {
    console.log(`[ERROR] .env file not found at: ${envPath}`);
    
    if (fs.existsSync(envExamplePath)) {
      console.log(`[INFO] Found .env.example at: ${envExamplePath}`);
      console.log("[INFO] Copy .env.example to .env and fill in your values");
    } else {
      console.log("[WARN] .env.example not found");
    }
    
    return false;
  }

  console.log(`[OK] .env file found at: ${envPath}`);
  return true;
}

function main() {
  console.log("=".repeat(60));
  console.log("Environment Variables Checker");
  console.log("=".repeat(60));
  console.log();

  const envFileExists = checkEnvFile();
  console.log();

  const result = checkEnvVars();

  console.log();
  console.log("=".repeat(60));

  if (!result.valid) {
    console.log("\n[FAILED] Missing required environment variables:");
    result.missing.forEach((varName) => {
      console.log(`  - ${varName}`);
    });
    console.log("\nPlease set these variables in your .env file");
    console.log("or export them in your environment.");
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.log("\n[WARN] Optional variables not set:");
    result.warnings.forEach((varName) => {
      console.log(`  - ${varName}`);
    });
    console.log("\nThese are optional and will use default values.");
  }

  if (result.valid) {
    console.log("\n[SUCCESS] All required environment variables are set!");
    console.log("\nYou can now run the application with:");
    console.log("  npm run dev     (development)");
    console.log("  npm start       (production)");
  }

  console.log();
}

main();

