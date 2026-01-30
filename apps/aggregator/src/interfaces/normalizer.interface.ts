import { RawPrice } from '@oracle-stocks/shared';
import { NormalizedPriceRecord, NormalizedSource } from './normalized-price.interface';

/**
 * Interface for source-specific normalization strategies.
 * Each data source should implement this interface.
 */
export interface Normalizer {
  /** Unique identifier for this normalizer */
  readonly name: string;

  /** The source this normalizer handles */
  readonly source: NormalizedSource;

  /** Version string for tracking normalization logic changes */
  readonly version: string;

  /**
   * Check if this normalizer can handle the given raw price
   * @param rawPrice - The raw price to check
   * @returns true if this normalizer supports the source
   */
  canNormalize(rawPrice: RawPrice): boolean;

  /**
   * Normalize a single raw price record
   * @param rawPrice - The raw price to normalize
   * @returns Normalized price or throws NormalizationException
   */
  normalize(rawPrice: RawPrice): NormalizedPriceRecord;

  /**
   * Normalize multiple raw price records
   * @param rawPrices - Array of raw prices to normalize
   * @returns Array of normalized prices (invalid entries filtered out)
   */
  normalizeMany(rawPrices: RawPrice[]): NormalizedPriceRecord[];
}

/**
 * Result type for batch normalization with error tracking
 */
export interface NormalizationResult {
  successful: NormalizedPriceRecord[];
  failed: NormalizationFailure[];
}

/**
 * Represents a failed normalization attempt
 */
export interface NormalizationFailure {
  rawPrice: RawPrice;
  error: string;
  timestamp: string;
}
