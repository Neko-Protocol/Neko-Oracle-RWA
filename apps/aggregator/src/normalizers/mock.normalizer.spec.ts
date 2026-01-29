import { MockNormalizer } from './mock.normalizer';
import { NormalizedSource } from '../interfaces/normalized-price.interface';
import { RawPrice } from '@oracle-stocks/shared';

describe('MockNormalizer', () => {
  let normalizer: MockNormalizer;

  const createMockPrice = (overrides: Partial<RawPrice> = {}): RawPrice => ({
    symbol: 'AAPL',
    price: 150.0,
    timestamp: Date.now(),
    source: 'MockProvider',
    ...overrides,
  });

  beforeEach(() => {
    normalizer = new MockNormalizer();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(normalizer.name).toBe('MockNormalizer');
    });

    it('should have correct source', () => {
      expect(normalizer.source).toBe(NormalizedSource.MOCK);
    });

    it('should have version', () => {
      expect(normalizer.version).toBe('1.0.0');
    });
  });

  describe('canNormalize', () => {
    it('should return true for MockProvider source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'MockProvider' }))).toBe(true);
    });

    it('should return true for mock source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'mock' }))).toBe(true);
    });

    it('should return true for MOCK uppercase', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'MOCK' }))).toBe(true);
    });

    it('should return true for MockData source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'MockData' }))).toBe(true);
    });

    it('should return false for AlphaVantage source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'AlphaVantage' }))).toBe(false);
    });

    it('should return false for Finnhub source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'Finnhub' }))).toBe(false);
    });
  });

  describe('normalizeSymbol', () => {
    it('should uppercase symbols', () => {
      expect(normalizer.normalizeSymbol('aapl')).toBe('AAPL');
    });

    it('should trim whitespace', () => {
      expect(normalizer.normalizeSymbol('  AAPL  ')).toBe('AAPL');
    });

    it('should handle already clean symbols', () => {
      expect(normalizer.normalizeSymbol('AAPL')).toBe('AAPL');
    });
  });

  describe('normalize', () => {
    it('should produce correct normalized price', () => {
      const rawPrice = createMockPrice({ symbol: 'tsla', price: 250.5 });
      const result = normalizer.normalize(rawPrice);

      expect(result.symbol).toBe('TSLA');
      expect(result.price).toBe(250.5);
      expect(result.source).toBe(NormalizedSource.MOCK);
    });

    it('should track transformation when symbol is uppercased', () => {
      const rawPrice = createMockPrice({ symbol: 'aapl' });
      const result = normalizer.normalize(rawPrice);

      expect(result.metadata.wasTransformed).toBe(true);
      expect(result.metadata.transformations.length).toBeGreaterThan(0);
    });
  });

  describe('normalizeMany', () => {
    it('should normalize multiple prices', () => {
      const prices = [
        createMockPrice({ symbol: 'AAPL' }),
        createMockPrice({ symbol: 'GOOGL' }),
      ];

      const results = normalizer.normalizeMany(prices);

      expect(results.length).toBe(2);
    });

    it('should skip prices from other sources', () => {
      const prices = [
        createMockPrice({ symbol: 'AAPL' }),
        createMockPrice({ symbol: 'GOOGL', source: 'AlphaVantage' }),
      ];

      const results = normalizer.normalizeMany(prices);

      expect(results.length).toBe(1);
    });
  });
});
