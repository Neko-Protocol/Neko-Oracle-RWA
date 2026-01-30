/**
 * Enum for standardized source identifiers
 */
export enum NormalizedSource {
  ALPHA_VANTAGE = 'alpha_vantage',
  FINNHUB = 'finnhub',
  YAHOO_FINANCE = 'yahoo_finance',
  MOCK = 'mock',
  UNKNOWN = 'unknown',
}

/**
 * Metadata tracking normalization processing
 */
export interface NormalizationMetadata {
  /** Original source string before normalization */
  originalSource: string;

  /** Original symbol before normalization (e.g., 'AAPL.US') */
  originalSymbol: string;

  /** ISO 8601 timestamp when normalization was performed */
  normalizedAt: string;

  /** Version of the normalization logic used */
  normalizerVersion: string;

  /** Whether any transformations were applied */
  wasTransformed: boolean;

  /** List of transformations applied (for debugging/audit) */
  transformations: string[];
}

/**
 * Represents a fully normalized price record with standard formatting
 * and metadata for audit/tracking purposes.
 * Used as output from the normalization service.
 */
export interface NormalizedPriceRecord {
  /** Normalized ticker symbol (e.g., 'AAPL' - stripped of exchange suffixes) */
  symbol: string;

  /** Price value normalized to minimum 4 decimal places */
  price: number;

  /** ISO 8601 UTC timestamp string (e.g., '2024-01-15T14:30:00.000Z') */
  timestamp: string;

  /** Original Unix timestamp in milliseconds (preserved for precision) */
  originalTimestamp: number;

  /** Normalized source identifier */
  source: NormalizedSource;

  /** Metadata for tracking and audit purposes */
  metadata: NormalizationMetadata;
}

/**
 * Normalized price data structure from various sources
 * This is the input to the aggregation engine
 */
export interface NormalizedPrice {
  symbol: string;
  price: number;
  timestamp: number;
  source: string;
  weight?: number; // Optional weight override for this specific price
}
