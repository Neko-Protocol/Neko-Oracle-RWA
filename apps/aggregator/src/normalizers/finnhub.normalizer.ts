import { RawPrice } from '@oracle-stocks/shared';
import { NormalizedSource } from '../interfaces/normalized-price.interface';
import { BaseNormalizer } from './base.normalizer';

/**
 * Normalizer for Finnhub data source.
 *
 * Handles quirks:
 * - Exchange prefix format like "US-AAPL", "CRYPTO-BTC"
 */
export class FinnhubNormalizer extends BaseNormalizer {
  readonly name = 'FinnhubNormalizer';
  readonly source = NormalizedSource.FINNHUB;
  readonly version = '1.0.0';

  private readonly SOURCE_IDENTIFIERS = ['finnhub'];

  canNormalize(rawPrice: RawPrice): boolean {
    const sourceLower = rawPrice.source.toLowerCase();
    return this.SOURCE_IDENTIFIERS.some((id) => sourceLower.includes(id));
  }

  normalizeSymbol(symbol: string): string {
    let normalized = this.cleanSymbol(symbol);

    // Remove Finnhub exchange prefix format
    // e.g., "US-AAPL" -> "AAPL", "CRYPTO-BTC" -> "BTC"
    const prefixPattern = /^(US|CRYPTO|FX|INDICES)-/i;
    normalized = normalized.replace(prefixPattern, '');

    return normalized;
  }
}
