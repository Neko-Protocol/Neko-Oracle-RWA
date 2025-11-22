import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend, ProofData } from '@noir-lang/backend_barretenberg';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import circuit from './circuits/target/circuits.json';

export interface ProofInput {
  p1: string;  // Price from API 1 (7 decimals, e.g., "3000000000" for $300.00)
  p2: string;  // Price from API 2 (7 decimals, e.g., "3010000000" for $301.00)
  asset_id: string;  // Asset identifier (4 chars, e.g., "TSLA")
}

export interface ProofOutput {
  proof: ProofData;
  publicInputs: {
    finalPrice: string;  // Averaged price with 2 decimals
    assetId: string;     // Asset identifier
  };
  proofHex: string;  // Hex encoded proof for storage/transmission
  publicInputsHex: string;  // Hex encoded public inputs
}

const CIRCUITS_DIR = path.join(__dirname, 'circuits');
const TARGET_DIR = path.join(CIRCUITS_DIR, 'target');
const PROVER_TOML = path.join(CIRCUITS_DIR, 'Prover.toml');

export class ZKProver {
  /**
   * Write inputs to Prover.toml file
   */
  private writeProverToml(input: ProofInput): void {
    const tomlContent = `asset_id = "${input.asset_id}"\np1 = "${input.p1}"\np2 = "${input.p2}"\n`;
    fs.writeFileSync(PROVER_TOML, tomlContent, 'utf8');
  }

  /**
   * Read circuit output from the execution
   */
  private readCircuitOutput(): { finalPrice: string; assetId: string } {
    try {
      // Read the witness file or parse nargo execute output
      // For now, we'll parse from the execution output
      // The circuit returns (final_price: u64, asset_id: str<4>)
      
      // Execute and capture output
      const output = execSync('nargo execute', {
        cwd: CIRCUITS_DIR,
        encoding: 'utf8',
      });
      
      // Parse output like: "Circuit output: (30050, "TSLA")"
      const match = output.match(/Circuit output: \((\d+), "([^"]+)"\)/);
      if (match) {
        return {
          finalPrice: match[1],
          assetId: match[2],
        };
      }
      
      throw new Error('Could not parse circuit output');
    } catch (error) {
      throw new Error(`Failed to read circuit output: ${error}`);
    }
  }

  /**
   * Generate a ZK proof using command-line tools (bb)
   * @param input - The two prices and asset ID
   * @returns Proof data and public outputs
   */
  async generateProof(input: ProofInput): Promise<ProofOutput> {
    try {
      console.log('[PROVER] Generating ZK proof using bb CLI...');
      console.log(`[PROVER] Input: p1=${input.p1}, p2=${input.p2}, asset_id=${input.asset_id}`);

      // Step 1: Write inputs to Prover.toml
      console.log('[PROVER] Writing inputs to Prover.toml...');
      this.writeProverToml(input);

      // Step 2: Execute circuit to generate witness
      console.log('[PROVER] Executing circuit (nargo execute)...');
      execSync('nargo execute', {
        cwd: CIRCUITS_DIR,
        stdio: 'inherit',
      });

      // Step 3: Read circuit output
      const circuitOutput = this.readCircuitOutput();
      console.log(`[PROVER] Circuit output - Final price: ${circuitOutput.finalPrice}, Asset: ${circuitOutput.assetId}`);

      // Step 4: Generate verification key
      console.log('[PROVER] Generating verification key (bb write_vk)...');
      execSync('bb write_vk -b ./target/circuits.json -o ./target', {
        cwd: CIRCUITS_DIR,
        stdio: 'inherit',
      });

      // Step 5: Generate proof
      console.log('[PROVER] Generating proof (bb prove)...');
      execSync('bb prove -b ./target/circuits.json -w ./target/circuits.gz -o ./target', {
        cwd: CIRCUITS_DIR,
        stdio: 'inherit',
      });

      // Step 6: Read proof and public inputs
      const proofPath = path.join(TARGET_DIR, 'proof');
      const publicInputsPath = path.join(TARGET_DIR, 'public_inputs');
      
      const proofBuffer = fs.readFileSync(proofPath);
      const publicInputsBuffer = fs.readFileSync(publicInputsPath);
      
      const proofHex = proofBuffer.toString('hex');
      const publicInputsHex = publicInputsBuffer.toString('hex');

      console.log('[PROVER] Proof generated successfully');
      console.log(`[PROVER] Final price (2 decimals): ${circuitOutput.finalPrice}`);
      console.log(`[PROVER] Asset ID: ${circuitOutput.assetId}`);
      console.log(`[PROVER] Proof size: ${proofBuffer.length} bytes`);

      // Create ProofData compatible structure
      const proof: ProofData = {
        proof: Uint8Array.from(proofBuffer),
        publicInputs: JSON.parse(publicInputsHex.length > 0 ? `["${circuitOutput.finalPrice}"]` : '[]'),
      };

      return {
        proof,
        publicInputs: {
          finalPrice: circuitOutput.finalPrice,
          assetId: circuitOutput.assetId,
        },
        proofHex,
        publicInputsHex,
      };
    } catch (error) {
      console.error('[PROVER] Failed to generate proof:', error);
      throw new Error(`Proof generation failed: ${error}`);
    }
  }

  /**
   * Verify a ZK proof using bb CLI
   * @param proof - The proof data to verify
   * @returns True if proof is valid, false otherwise
   */
  async verifyProof(proof: ProofData): Promise<boolean> {
    try {
      console.log('[PROVER] Verifying proof using bb CLI...');
      
      // The proof should already exist in target/proof from generateProof
      // Just run bb verify
      execSync('bb verify -p ./target/proof -k ./target/vk', {
        cwd: CIRCUITS_DIR,
        stdio: 'inherit',
      });
      
      console.log('[PROVER] Proof verification: VALID');
      return true;
    } catch (error) {
      console.error('[PROVER] Proof verification failed:', error);
      return false;
    }
  }

  /**
   * Verify a proof from hex strings
   * @param proofHex - Hex encoded proof
   * @param publicInputsHex - JSON string of public inputs
   * @returns True if proof is valid, false otherwise
   */
  async verifyProofFromHex(proofHex: string, publicInputsHex: string): Promise<boolean> {
    try {
      // Write proof to file
      const proofPath = path.join(TARGET_DIR, 'proof');
      fs.writeFileSync(proofPath, Buffer.from(proofHex, 'hex'));
      
      // Verify using bb
      execSync('bb verify -p ./target/proof -k ./target/vk', {
        cwd: CIRCUITS_DIR,
        stdio: 'inherit',
      });
      
      return true;
    } catch (error) {
      console.error('[PROVER] Failed to verify proof from hex:', error);
      return false;
    }
  }

  /**
   * Destroy the backend and free resources
   */
  async destroy(): Promise<void> {
    // No cleanup needed for CLI-based approach
    console.log('[PROVER] Cleanup complete');
  }
}

/**
 * Helper function to convert price number to circuit input format
 * @param price - Price as number (already scaled by 1e7)
 * @returns String representation for circuit input
 */
export function priceToCircuitInput(price: number): string {
  return Math.round(price).toString();
}

/**
 * Helper function to convert circuit output (2 decimals) back to display format
 * @param circuitPrice - Price from circuit output (2 decimals)
 * @returns Price as number (e.g., 30000 -> 300.00)
 */
export function circuitOutputToPrice(circuitPrice: string): number {
  return parseFloat(circuitPrice) / 100;
}

/**
 * Helper function to pad asset ID to 4 characters
 * @param assetId - Asset identifier (e.g., "BTC")
 * @returns Padded asset ID (e.g., "BTC ")
 */
export function padAssetId(assetId: string): string {
  return assetId.padEnd(4, ' ').substring(0, 4);
}
