/**
 * Normalized price data from any provider
 * This is the canonical format for all ingested price data
 */
export interface RawPrice {
  /** Stock ticker symbol (e.g., 'AAPL', 'GOOGL') */
  symbol: string;

  /** Price value in USD */
  price: number;

  /** Unix timestamp in milliseconds when price was recorded */
  timestamp: number;

  /** Data source identifier (e.g., 'AlphaVantage', 'YahooFinance') */
  source: string;
}
