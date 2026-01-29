import { AlphaVantageNormalizer } from './alpha-vantage.normalizer';
import { NormalizedSource } from '../interfaces/normalized-price.interface';
import { RawPrice } from '@oracle-stocks/shared';

describe('AlphaVantageNormalizer', () => {
  let normalizer: AlphaVantageNormalizer;

  const createMockPrice = (overrides: Partial<RawPrice> = {}): RawPrice => ({
    symbol: 'AAPL',
    price: 150.0,
    timestamp: Date.now(),
    source: 'AlphaVantage',
    ...overrides,
  });

  beforeEach(() => {
    normalizer = new AlphaVantageNormalizer();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(normalizer.name).toBe('AlphaVantageNormalizer');
    });

    it('should have correct source', () => {
      expect(normalizer.source).toBe(NormalizedSource.ALPHA_VANTAGE);
    });

    it('should have version', () => {
      expect(normalizer.version).toBe('1.0.0');
    });
  });

  describe('canNormalize', () => {
    it('should return true for AlphaVantage source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'AlphaVantage' }))).toBe(true);
    });

    it('should return true for alpha_vantage source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'alpha_vantage' }))).toBe(true);
    });

    it('should return true for alpha-vantage source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'alpha-vantage' }))).toBe(true);
    });

    it('should return true for ALPHAVANTAGE source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'ALPHAVANTAGE' }))).toBe(true);
    });

    it('should return false for Finnhub source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'Finnhub' }))).toBe(false);
    });

    it('should return false for Yahoo source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'Yahoo Finance' }))).toBe(false);
    });
  });

  describe('normalizeSymbol', () => {
    it('should remove .US suffix', () => {
      expect(normalizer.normalizeSymbol('AAPL.US')).toBe('AAPL');
    });

    it('should remove .NYSE suffix', () => {
      expect(normalizer.normalizeSymbol('MSFT.NYSE')).toBe('MSFT');
    });

    it('should remove .NASDAQ suffix', () => {
      expect(normalizer.normalizeSymbol('GOOGL.NASDAQ')).toBe('GOOGL');
    });

    it('should remove .LSE suffix', () => {
      expect(normalizer.normalizeSymbol('BP.LSE')).toBe('BP');
    });

    it('should remove .TSX suffix', () => {
      expect(normalizer.normalizeSymbol('RY.TSX')).toBe('RY');
    });

    it('should remove .ASX suffix', () => {
      expect(normalizer.normalizeSymbol('BHP.ASX')).toBe('BHP');
    });

    it('should remove .HK suffix', () => {
      expect(normalizer.normalizeSymbol('0005.HK')).toBe('0005');
    });

    it('should handle already clean symbols', () => {
      expect(normalizer.normalizeSymbol('GOOGL')).toBe('GOOGL');
    });

    it('should uppercase symbols', () => {
      expect(normalizer.normalizeSymbol('aapl.us')).toBe('AAPL');
    });

    it('should trim whitespace', () => {
      expect(normalizer.normalizeSymbol('  AAPL.US  ')).toBe('AAPL');
    });
  });

  describe('normalize', () => {
    it('should produce correct normalized price', () => {
      const rawPrice = createMockPrice({ symbol: 'AAPL.US', price: 150.123456 });
      const result = normalizer.normalize(rawPrice);

      expect(result.symbol).toBe('AAPL');
      expect(result.price).toBe(150.1235);
      expect(result.source).toBe(NormalizedSource.ALPHA_VANTAGE);
      expect(result.metadata.originalSymbol).toBe('AAPL.US');
      expect(result.metadata.wasTransformed).toBe(true);
    });
  });

  describe('normalizeMany', () => {
    it('should normalize multiple prices', () => {
      const prices = [
        createMockPrice({ symbol: 'AAPL.US' }),
        createMockPrice({ symbol: 'MSFT.NYSE' }),
      ];

      const results = normalizer.normalizeMany(prices);

      expect(results.length).toBe(2);
      expect(results[0].symbol).toBe('AAPL');
      expect(results[1].symbol).toBe('MSFT');
    });

    it('should skip prices from other sources', () => {
      const prices = [
        createMockPrice({ symbol: 'AAPL.US' }),
        createMockPrice({ symbol: 'GOOGL', source: 'Finnhub' }),
      ];

      const results = normalizer.normalizeMany(prices);

      expect(results.length).toBe(1);
    });
  });
});
