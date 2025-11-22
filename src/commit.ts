import { buildPoseidon } from 'circomlibjs';
import { ZKProver, ProofInput, ProofOutput, priceToCircuitInput, padAssetId, circuitOutputToPrice } from './prover';
import { DualPriceData } from './fetcher';

export interface CommitInputs {
  price: number;
  timestamp: number;
  assetId: string;
}

export interface CommitWithProof {
  commitment: string;
  proof: ProofOutput;
  verifiedPrice: number;  // The ZK-verified averaged price (with 2 decimals)
  timestamp: number;
  assetId: string;
}

/**
 * Convert assetId string to integer for Poseidon hash
 */
function assetIdToInt(assetId: string): bigint {
  let hash = 0;
  for (let i = 0; i < assetId.length; i++) {
    const char = assetId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return BigInt(Math.abs(hash));
}

/**
 * Generate Poseidon commitment hash
 * @param price - Price value (already multiplied by 1e7)
 * @param timestamp - Unix timestamp
 * @param assetId - Asset identifier (e.g., "TSLA")
 * @returns Hex string of the commitment hash
 */
export async function generateCommit(
  price: number,
  timestamp: number,
  assetId: string
): Promise<string> {
  const poseidon = await buildPoseidon();
  
  const assetIdInt = assetIdToInt(assetId);
  
  // Poseidon hash: commit = Poseidon([price, timestamp, assetId_as_int])
  const inputs = [
    BigInt(price),
    BigInt(timestamp),
    assetIdInt,
  ];
  
  const commitment = poseidon(inputs);
  const commitmentBN = poseidon.F.toString(commitment);
  
  // Convert to hex string
  return BigInt(commitmentBN).toString(16);
}

/**
 * Generate ZK proof-verified commitment
 * Fetches both prices, generates ZK proof, verifies it, and creates commitment
 * @param dualPrices - Both prices from different APIs
 * @param timestamp - Unix timestamp
 * @param assetId - Asset identifier (e.g., "TSLA")
 * @returns Commitment with proof and verified price
 */
export async function generateCommitWithProof(
  dualPrices: DualPriceData,
  timestamp: number,
  assetId: string
): Promise<CommitWithProof> {
  const prover = new ZKProver();
  
  try {
    console.log('[COMMIT] Starting ZK proof generation...');
    
    // Prepare inputs for the circuit
    const proofInput: ProofInput = {
      p1: priceToCircuitInput(dualPrices.price1.price),
      p2: priceToCircuitInput(dualPrices.price2.price),
      asset_id: padAssetId(assetId),
    };
    
    console.log(`[COMMIT] Price 1 (AlphaVantage): ${dualPrices.price1.price} (${dualPrices.price1.price / 1e7})`);
    console.log(`[COMMIT] Price 2 (Finnhub): ${dualPrices.price2.price} (${dualPrices.price2.price / 1e7})`);
    
    // Generate the ZK proof
    const proofOutput = await prover.generateProof(proofInput);
    
    // Verify the proof off-chain
    console.log('[COMMIT] Verifying proof off-chain...');
    const isValid = await prover.verifyProof(proofOutput.proof);
    
    if (!isValid) {
      throw new Error('Proof verification failed! Prices may differ by more than 7%');
    }
    
    console.log('[COMMIT] ✓ Proof verified successfully');
    
    // Extract the verified average price from public outputs (2 decimals)
    const verifiedPriceRaw = parseInt(proofOutput.publicInputs.finalPrice);
    const verifiedPrice = verifiedPriceRaw * 1e5; // Convert from 2 decimals to 7 decimals
    
    console.log(`[COMMIT] Verified average price: ${verifiedPrice} (${verifiedPrice / 1e7} with 2 decimals: ${verifiedPriceRaw})`);
    
    const poseidon = await buildPoseidon();
    const assetIdInt = assetIdToInt(assetId);
    
    // Create commitment including the proof hash
    // Poseidon([verifiedPrice, timestamp, assetId, proofHash])
    const proofHashBigInt = BigInt('0x' + proofOutput.proofHex.slice(0, 32)); // First 32 chars of proof hex
    
    const inputs = [
      BigInt(verifiedPrice),
      BigInt(timestamp),
      assetIdInt,
      proofHashBigInt,
    ];
    
    const commitment = poseidon(inputs);
    const commitmentBN = poseidon.F.toString(commitment);
    const commitmentHex = BigInt(commitmentBN).toString(16);
    
    console.log('[COMMIT] Commitment generated with proof hash');
    console.log(`[COMMIT] Commitment: ${commitmentHex}`);
    
    return {
      commitment: commitmentHex,
      proof: proofOutput,
      verifiedPrice,
      timestamp,
      assetId,
    };
  } catch (error) {
    console.error('[COMMIT] Failed to generate commit with proof:', error);
    throw error;
  } finally {
    // Clean up backend resources
    await prover.destroy();
  }
}

/**
 * Debug function to log commitment inputs
 */
export function debugCommitInputs(
  price: number,
  timestamp: number,
  assetId: string
): void {
  const assetIdInt = assetIdToInt(assetId);
  
  console.log('=== Commit Debug Info ===');
  console.log(`Price: ${price} (raw: ${price / 1e7})`);
  console.log(`Timestamp: ${timestamp} (${new Date(timestamp * 1000).toISOString()})`);
  console.log(`Asset ID: ${assetId}`);
  console.log(`Asset ID (as int): ${assetIdInt}`);
  console.log('========================');
}
