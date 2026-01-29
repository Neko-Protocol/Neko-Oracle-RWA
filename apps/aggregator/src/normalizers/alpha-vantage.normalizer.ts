import { RawPrice } from '@oracle-stocks/shared';
import { NormalizedSource } from '../interfaces/normalized-price.interface';
import { BaseNormalizer } from './base.normalizer';

/**
 * Normalizer for Alpha Vantage data source.
 *
 * Handles quirks:
 * - Exchange suffixes like ".US", ".NYSE", ".NASDAQ"
 * - Case variations in source name
 */
export class AlphaVantageNormalizer extends BaseNormalizer {
  readonly name = 'AlphaVantageNormalizer';
  readonly source = NormalizedSource.ALPHA_VANTAGE;
  readonly version = '1.0.0';

  private readonly SOURCE_IDENTIFIERS = [
    'alphavantage',
    'alpha_vantage',
    'alpha-vantage',
  ];

  canNormalize(rawPrice: RawPrice): boolean {
    const sourceLower = rawPrice.source.toLowerCase().replace(/[\s_-]/g, '');
    return this.SOURCE_IDENTIFIERS.some((id) =>
      sourceLower.includes(id.replace(/[\s_-]/g, '')),
    );
  }

  normalizeSymbol(symbol: string): string {
    let normalized = this.cleanSymbol(symbol);

    // Remove common Alpha Vantage exchange suffixes
    // e.g., "AAPL.US" -> "AAPL", "MSFT.NYSE" -> "MSFT"
    const suffixPattern = /\.(US|NYSE|NASDAQ|LSE|TSX|ASX|HK|LON)$/i;
    normalized = normalized.replace(suffixPattern, '');

    return normalized;
  }
}
