import { FinnhubNormalizer } from './finnhub.normalizer';
import { NormalizedSource } from '../interfaces/normalized-price.interface';
import { RawPrice } from '@oracle-stocks/shared';

describe('FinnhubNormalizer', () => {
  let normalizer: FinnhubNormalizer;

  const createMockPrice = (overrides: Partial<RawPrice> = {}): RawPrice => ({
    symbol: 'AAPL',
    price: 150.0,
    timestamp: Date.now(),
    source: 'Finnhub',
    ...overrides,
  });

  beforeEach(() => {
    normalizer = new FinnhubNormalizer();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(normalizer.name).toBe('FinnhubNormalizer');
    });

    it('should have correct source', () => {
      expect(normalizer.source).toBe(NormalizedSource.FINNHUB);
    });

    it('should have version', () => {
      expect(normalizer.version).toBe('1.0.0');
    });
  });

  describe('canNormalize', () => {
    it('should return true for Finnhub source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'Finnhub' }))).toBe(true);
    });

    it('should return true for finnhub lowercase', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'finnhub' }))).toBe(true);
    });

    it('should return true for FINNHUB uppercase', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'FINNHUB' }))).toBe(true);
    });

    it('should return false for AlphaVantage source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'AlphaVantage' }))).toBe(false);
    });

    it('should return false for Yahoo source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'Yahoo Finance' }))).toBe(false);
    });
  });

  describe('normalizeSymbol', () => {
    it('should remove US- prefix', () => {
      expect(normalizer.normalizeSymbol('US-AAPL')).toBe('AAPL');
    });

    it('should remove CRYPTO- prefix', () => {
      expect(normalizer.normalizeSymbol('CRYPTO-BTC')).toBe('BTC');
    });

    it('should remove FX- prefix', () => {
      expect(normalizer.normalizeSymbol('FX-EURUSD')).toBe('EURUSD');
    });

    it('should remove INDICES- prefix', () => {
      expect(normalizer.normalizeSymbol('INDICES-SPX')).toBe('SPX');
    });

    it('should handle already clean symbols', () => {
      expect(normalizer.normalizeSymbol('AAPL')).toBe('AAPL');
    });

    it('should uppercase symbols', () => {
      expect(normalizer.normalizeSymbol('us-aapl')).toBe('AAPL');
    });

    it('should trim whitespace', () => {
      expect(normalizer.normalizeSymbol('  US-AAPL  ')).toBe('AAPL');
    });
  });

  describe('normalize', () => {
    it('should produce correct normalized price', () => {
      const rawPrice = createMockPrice({ symbol: 'US-GOOGL', price: 140.5678 });
      const result = normalizer.normalize(rawPrice);

      expect(result.symbol).toBe('GOOGL');
      expect(result.price).toBe(140.5678);
      expect(result.source).toBe(NormalizedSource.FINNHUB);
      expect(result.metadata.originalSymbol).toBe('US-GOOGL');
    });
  });

  describe('normalizeMany', () => {
    it('should normalize multiple prices', () => {
      const prices = [
        createMockPrice({ symbol: 'US-AAPL' }),
        createMockPrice({ symbol: 'CRYPTO-ETH' }),
      ];

      const results = normalizer.normalizeMany(prices);

      expect(results.length).toBe(2);
      expect(results[0].symbol).toBe('AAPL');
      expect(results[1].symbol).toBe('ETH');
    });
  });
});
