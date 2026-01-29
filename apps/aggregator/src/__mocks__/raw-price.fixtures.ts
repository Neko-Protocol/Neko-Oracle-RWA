import { RawPrice } from '@oracle-stocks/shared';

/**
 * Test fixtures for raw price data from different sources
 */
export const mockRawPrices: Record<string, RawPrice> = {
  alphaVantage: {
    symbol: 'AAPL.US',
    price: 150.1234567,
    timestamp: 1705329000000, // 2024-01-15T14:30:00.000Z
    source: 'AlphaVantage',
  },
  alphaVantageNYSE: {
    symbol: 'MSFT.NYSE',
    price: 380.5,
    timestamp: 1705330200000,
    source: 'alpha_vantage',
  },
  finnhub: {
    symbol: 'US-GOOGL',
    price: 140.999,
    timestamp: 1705330200000,
    source: 'Finnhub',
  },
  finnhubCrypto: {
    symbol: 'CRYPTO-BTC',
    price: 42000.0,
    timestamp: 1705330200000,
    source: 'finnhub',
  },
  yahooFinance: {
    symbol: 'MSFT.L',
    price: 380.12345,
    timestamp: 1705330200000,
    source: 'Yahoo Finance',
  },
  yahooFinanceIndex: {
    symbol: '^DJI',
    price: 37500.0,
    timestamp: 1705330200000,
    source: 'yahoo_finance',
  },
  yahooFinanceAustralia: {
    symbol: 'BHP.AX',
    price: 45.67,
    timestamp: 1705330200000,
    source: 'YahooFinance',
  },
  mock: {
    symbol: 'TSLA',
    price: 250.5,
    timestamp: 1705330200000,
    source: 'MockProvider',
  },
  mockLowercase: {
    symbol: '  aapl  ',
    price: 150.0,
    timestamp: 1705330200000,
    source: 'mock',
  },
  unknown: {
    symbol: 'BTC',
    price: 42000.0,
    timestamp: 1705330200000,
    source: 'UnknownSource',
  },
};

/**
 * Malformed price data for testing validation
 */
export const malformedPrices: Array<Partial<RawPrice> | null | undefined> = [
  { symbol: '', price: 100, timestamp: Date.now(), source: 'Test' },
  { symbol: 'TEST', price: NaN, timestamp: Date.now(), source: 'Test' },
  { symbol: 'TEST', price: -100, timestamp: Date.now(), source: 'Test' },
  { symbol: 'TEST', price: 100, timestamp: null as unknown as number, source: 'Test' },
  { symbol: 'TEST', price: 100, timestamp: Date.now(), source: '' },
  { price: 100, timestamp: Date.now(), source: 'Test' } as Partial<RawPrice>,
  { symbol: 'TEST', timestamp: Date.now(), source: 'Test' } as Partial<RawPrice>,
  null,
  undefined,
];

/**
 * Valid raw prices for batch testing
 */
export const validRawPrices: RawPrice[] = [
  mockRawPrices.alphaVantage,
  mockRawPrices.finnhub,
  mockRawPrices.yahooFinance,
  mockRawPrices.mock,
];

/**
 * Mixed valid and invalid prices for error handling tests
 */
export const mixedRawPrices: RawPrice[] = [
  mockRawPrices.alphaVantage,
  mockRawPrices.unknown,
  mockRawPrices.finnhub,
];
