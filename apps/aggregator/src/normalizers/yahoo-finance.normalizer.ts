import { RawPrice } from '@oracle-stocks/shared';
import { NormalizedSource } from '../interfaces/normalized-price.interface';
import { BaseNormalizer } from './base.normalizer';

/**
 * Normalizer for Yahoo Finance data source.
 *
 * Handles quirks:
 * - Exchange suffixes like ".L" (London), ".T" (Tokyo), ".AX" (Australia)
 * - Index prefix "^" (e.g., "^DJI", "^GSPC")
 */
export class YahooFinanceNormalizer extends BaseNormalizer {
  readonly name = 'YahooFinanceNormalizer';
  readonly source = NormalizedSource.YAHOO_FINANCE;
  readonly version = '1.0.0';

  private readonly SOURCE_IDENTIFIERS = [
    'yahoo',
    'yahoofinance',
    'yahoo_finance',
    'yahoo-finance',
  ];

  canNormalize(rawPrice: RawPrice): boolean {
    const sourceLower = rawPrice.source.toLowerCase().replace(/[\s_-]/g, '');
    return this.SOURCE_IDENTIFIERS.some((id) =>
      sourceLower.includes(id.replace(/[\s_-]/g, '')),
    );
  }

  normalizeSymbol(symbol: string): string {
    let normalized = this.cleanSymbol(symbol);

    // Remove Yahoo Finance exchange suffixes
    // e.g., "AAPL.L" -> "AAPL", "BHP.AX" -> "BHP", "7203.T" -> "7203"
    const suffixPattern =
      /\.(L|T|AX|HK|SI|KS|TW|NS|BO|TO|V|F|DE|PA|AS|BR|MC|MI|SW|CO|MX|SA|JK|KL)$/i;
    normalized = normalized.replace(suffixPattern, '');

    // Remove index prefix (^DJI -> DJI, ^GSPC -> GSPC)
    if (normalized.startsWith('^')) {
      normalized = normalized.substring(1);
    }

    return normalized;
  }
}
