import { Logger } from '@nestjs/common';
import { RawPrice } from '@oracle-stocks/shared';
import {
  NormalizedPriceRecord,
  NormalizedSource,
  NormalizationMetadata,
} from '../interfaces/normalized-price.interface';
import { Normalizer } from '../interfaces/normalizer.interface';
import { ValidationException } from '../exceptions';

/**
 * Abstract base class for all normalizers providing common functionality.
 * Subclasses must implement source-specific symbol normalization.
 */
export abstract class BaseNormalizer implements Normalizer {
  protected readonly logger: Logger;

  abstract readonly name: string;
  abstract readonly source: NormalizedSource;
  abstract readonly version: string;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Check if this normalizer can handle the given raw price
   */
  abstract canNormalize(rawPrice: RawPrice): boolean;

  /**
   * Source-specific symbol normalization - must be implemented by subclasses
   */
  abstract normalizeSymbol(symbol: string): string;

  /**
   * Normalize a single raw price record
   */
  normalize(rawPrice: RawPrice): NormalizedPriceRecord {
    this.validateRawPrice(rawPrice);

    const transformations: string[] = [];

    // Normalize symbol
    const normalizedSymbol = this.normalizeSymbol(rawPrice.symbol);
    if (normalizedSymbol !== rawPrice.symbol) {
      transformations.push(`symbol: ${rawPrice.symbol} -> ${normalizedSymbol}`);
    }

    // Normalize price to 4 decimal places
    const normalizedPrice = this.normalizePrice(rawPrice.price);
    if (normalizedPrice !== rawPrice.price) {
      transformations.push(`price: ${rawPrice.price} -> ${normalizedPrice}`);
    }

    // Normalize timestamp to ISO 8601 UTC
    const isoTimestamp = this.normalizeTimestamp(rawPrice.timestamp);

    const metadata: NormalizationMetadata = {
      originalSource: rawPrice.source,
      originalSymbol: rawPrice.symbol,
      normalizedAt: new Date().toISOString(),
      normalizerVersion: this.version,
      wasTransformed: transformations.length > 0,
      transformations,
    };

    return {
      symbol: normalizedSymbol,
      price: normalizedPrice,
      timestamp: isoTimestamp,
      originalTimestamp: rawPrice.timestamp,
      source: this.source,
      metadata,
    };
  }

  /**
   * Normalize multiple raw price records, skipping failures
   */
  normalizeMany(rawPrices: RawPrice[]): NormalizedPriceRecord[] {
    const results: NormalizedPriceRecord[] = [];

    for (const rawPrice of rawPrices) {
      try {
        if (this.canNormalize(rawPrice)) {
          results.push(this.normalize(rawPrice));
        }
      } catch (error) {
        this.logger.warn(
          `Failed to normalize price for ${rawPrice.symbol}: ${(error as Error).message}`,
        );
      }
    }

    return results;
  }

  /**
   * Validate that raw price has all required fields
   */
  protected validateRawPrice(rawPrice: RawPrice): void {
    if (!rawPrice) {
      throw new ValidationException('Raw price cannot be null or undefined');
    }
    if (!rawPrice.symbol || typeof rawPrice.symbol !== 'string') {
      throw new ValidationException(
        'Symbol is required and must be a string',
        rawPrice,
      );
    }
    if (
      rawPrice.price === null ||
      rawPrice.price === undefined ||
      typeof rawPrice.price !== 'number'
    ) {
      throw new ValidationException(
        'Price is required and must be a number',
        rawPrice,
      );
    }
    if (isNaN(rawPrice.price) || !isFinite(rawPrice.price)) {
      throw new ValidationException(
        'Price must be a valid finite number',
        rawPrice,
      );
    }
    if (rawPrice.price < 0) {
      throw new ValidationException('Price cannot be negative', rawPrice);
    }
    if (!rawPrice.timestamp || typeof rawPrice.timestamp !== 'number') {
      throw new ValidationException(
        'Timestamp is required and must be a number',
        rawPrice,
      );
    }
    if (!rawPrice.source || typeof rawPrice.source !== 'string') {
      throw new ValidationException(
        'Source is required and must be a string',
        rawPrice,
      );
    }
  }

  /**
   * Normalize price to 4 decimal places for financial precision
   */
  protected normalizePrice(price: number): number {
    return Math.round(price * 10000) / 10000;
  }

  /**
   * Convert Unix timestamp (milliseconds) to ISO 8601 UTC string
   */
  protected normalizeTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new ValidationException(`Invalid timestamp: ${timestamp}`);
    }
    return date.toISOString();
  }

  /**
   * Common symbol cleaning: trim whitespace, uppercase
   */
  protected cleanSymbol(symbol: string): string {
    return symbol.trim().toUpperCase();
  }
}
