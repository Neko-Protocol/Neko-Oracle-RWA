import { RawPrice } from '@oracle-stocks/shared';
import { NormalizedSource } from '../interfaces/normalized-price.interface';
import { BaseNormalizer } from './base.normalizer';

/**
 * Normalizer for Mock data source (used for testing/development).
 *
 * Performs basic pass-through normalization with standard cleaning.
 */
export class MockNormalizer extends BaseNormalizer {
  readonly name = 'MockNormalizer';
  readonly source = NormalizedSource.MOCK;
  readonly version = '1.0.0';

  canNormalize(rawPrice: RawPrice): boolean {
    return rawPrice.source.toLowerCase().includes('mock');
  }

  normalizeSymbol(symbol: string): string {
    return this.cleanSymbol(symbol);
  }
}
