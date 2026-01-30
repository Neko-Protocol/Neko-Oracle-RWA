import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RawPrice } from '@oracle-stocks/shared';
import {
  NormalizedPriceRecord,
  NormalizedSource,
} from '../interfaces/normalized-price.interface';
import {
  Normalizer,
  NormalizationResult,
  NormalizationFailure,
} from '../interfaces/normalizer.interface';
import {
  AlphaVantageNormalizer,
  FinnhubNormalizer,
  YahooFinanceNormalizer,
  MockNormalizer,
} from '../normalizers';
import { NormalizationException } from '../exceptions';

/**
 * Service for normalizing raw price data from multiple sources.
 * Uses the Strategy pattern to delegate normalization to source-specific normalizers.
 */
@Injectable()
export class NormalizationService implements OnModuleInit {
  private readonly logger = new Logger(NormalizationService.name);
  private readonly normalizers: Map<string, Normalizer> = new Map();

  onModuleInit(): void {
    this.registerDefaultNormalizers();
    this.logger.log(
      `NormalizationService initialized with ${this.normalizers.size} normalizers`,
    );
  }

  /**
   * Register all default normalizers
   */
  private registerDefaultNormalizers(): void {
    this.registerNormalizer(new AlphaVantageNormalizer());
    this.registerNormalizer(new FinnhubNormalizer());
    this.registerNormalizer(new YahooFinanceNormalizer());
    this.registerNormalizer(new MockNormalizer());
  }

  /**
   * Register a new normalizer (for extensibility)
   */
  registerNormalizer(normalizer: Normalizer): void {
    this.normalizers.set(normalizer.name, normalizer);
    this.logger.debug(`Registered normalizer: ${normalizer.name}`);
  }

  /**
   * Get all registered normalizers
   */
  getNormalizers(): Normalizer[] {
    return Array.from(this.normalizers.values());
  }

  /**
   * Find the appropriate normalizer for a raw price
   */
  findNormalizer(rawPrice: RawPrice): Normalizer | null {
    for (const normalizer of this.normalizers.values()) {
      if (normalizer.canNormalize(rawPrice)) {
        return normalizer;
      }
    }
    return null;
  }

  /**
   * Normalize a single raw price
   * @throws NormalizationException if no suitable normalizer found
   */
  normalize(rawPrice: RawPrice): NormalizedPriceRecord {
    const normalizer = this.findNormalizer(rawPrice);

    if (!normalizer) {
      throw new NormalizationException(
        `No normalizer found for source: ${rawPrice.source}`,
        rawPrice,
      );
    }

    this.logger.debug(
      `Normalizing ${rawPrice.symbol} from ${rawPrice.source} using ${normalizer.name}`,
    );

    return normalizer.normalize(rawPrice);
  }

  /**
   * Normalize multiple raw prices (skips failures)
   */
  normalizeMany(rawPrices: RawPrice[]): NormalizedPriceRecord[] {
    const results: NormalizedPriceRecord[] = [];

    for (const rawPrice of rawPrices) {
      try {
        results.push(this.normalize(rawPrice));
      } catch (error) {
        this.logger.warn(
          `Failed to normalize ${rawPrice.symbol} from ${rawPrice.source}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Normalized ${results.length}/${rawPrices.length} prices successfully`,
    );

    return results;
  }

  /**
   * Normalize multiple raw prices with detailed error reporting
   */
  normalizeManyWithErrors(rawPrices: RawPrice[]): NormalizationResult {
    const successful: NormalizedPriceRecord[] = [];
    const failed: NormalizationFailure[] = [];

    for (const rawPrice of rawPrices) {
      try {
        successful.push(this.normalize(rawPrice));
      } catch (error) {
        failed.push({
          rawPrice,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.logger.log(
      `Normalization complete: ${successful.length} successful, ${failed.length} failed`,
    );

    return { successful, failed };
  }

  /**
   * Normalize prices grouped by source
   */
  normalizeBySource(
    rawPrices: RawPrice[],
  ): Map<NormalizedSource, NormalizedPriceRecord[]> {
    const result = new Map<NormalizedSource, NormalizedPriceRecord[]>();

    for (const rawPrice of rawPrices) {
      try {
        const normalized = this.normalize(rawPrice);
        const existing = result.get(normalized.source) || [];
        existing.push(normalized);
        result.set(normalized.source, existing);
      } catch (error) {
        this.logger.warn(
          `Failed to normalize ${rawPrice.symbol}: ${(error as Error).message}`,
        );
      }
    }

    return result;
  }
}
