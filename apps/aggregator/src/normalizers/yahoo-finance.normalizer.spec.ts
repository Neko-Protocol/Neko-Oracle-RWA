import { YahooFinanceNormalizer } from './yahoo-finance.normalizer';
import { NormalizedSource } from '../interfaces/normalized-price.interface';
import { RawPrice } from '@oracle-stocks/shared';

describe('YahooFinanceNormalizer', () => {
  let normalizer: YahooFinanceNormalizer;

  const createMockPrice = (overrides: Partial<RawPrice> = {}): RawPrice => ({
    symbol: 'AAPL',
    price: 150.0,
    timestamp: Date.now(),
    source: 'Yahoo Finance',
    ...overrides,
  });

  beforeEach(() => {
    normalizer = new YahooFinanceNormalizer();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(normalizer.name).toBe('YahooFinanceNormalizer');
    });

    it('should have correct source', () => {
      expect(normalizer.source).toBe(NormalizedSource.YAHOO_FINANCE);
    });

    it('should have version', () => {
      expect(normalizer.version).toBe('1.0.0');
    });
  });

  describe('canNormalize', () => {
    it('should return true for Yahoo Finance source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'Yahoo Finance' }))).toBe(true);
    });

    it('should return true for yahoo_finance source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'yahoo_finance' }))).toBe(true);
    });

    it('should return true for yahoo-finance source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'yahoo-finance' }))).toBe(true);
    });

    it('should return true for YahooFinance source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'YahooFinance' }))).toBe(true);
    });

    it('should return true for yahoo source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'yahoo' }))).toBe(true);
    });

    it('should return false for AlphaVantage source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'AlphaVantage' }))).toBe(false);
    });

    it('should return false for Finnhub source', () => {
      expect(normalizer.canNormalize(createMockPrice({ source: 'Finnhub' }))).toBe(false);
    });
  });

  describe('normalizeSymbol', () => {
    it('should remove .L suffix (London)', () => {
      expect(normalizer.normalizeSymbol('BP.L')).toBe('BP');
    });

    it('should remove .T suffix (Tokyo)', () => {
      expect(normalizer.normalizeSymbol('7203.T')).toBe('7203');
    });

    it('should remove .AX suffix (Australia)', () => {
      expect(normalizer.normalizeSymbol('BHP.AX')).toBe('BHP');
    });

    it('should remove .HK suffix (Hong Kong)', () => {
      expect(normalizer.normalizeSymbol('0005.HK')).toBe('0005');
    });

    it('should remove .SI suffix (Singapore)', () => {
      expect(normalizer.normalizeSymbol('D05.SI')).toBe('D05');
    });

    it('should remove .KS suffix (Korea)', () => {
      expect(normalizer.normalizeSymbol('005930.KS')).toBe('005930');
    });

    it('should remove .TW suffix (Taiwan)', () => {
      expect(normalizer.normalizeSymbol('2330.TW')).toBe('2330');
    });

    it('should remove .NS suffix (India NSE)', () => {
      expect(normalizer.normalizeSymbol('RELIANCE.NS')).toBe('RELIANCE');
    });

    it('should remove .BO suffix (India BSE)', () => {
      expect(normalizer.normalizeSymbol('RELIANCE.BO')).toBe('RELIANCE');
    });

    it('should remove .TO suffix (Toronto)', () => {
      expect(normalizer.normalizeSymbol('RY.TO')).toBe('RY');
    });

    it('should remove .DE suffix (Germany)', () => {
      expect(normalizer.normalizeSymbol('SAP.DE')).toBe('SAP');
    });

    it('should remove .PA suffix (Paris)', () => {
      expect(normalizer.normalizeSymbol('MC.PA')).toBe('MC');
    });

    it('should remove ^ prefix for indices', () => {
      expect(normalizer.normalizeSymbol('^DJI')).toBe('DJI');
    });

    it('should remove ^ prefix for S&P 500', () => {
      expect(normalizer.normalizeSymbol('^GSPC')).toBe('GSPC');
    });

    it('should remove ^ prefix for NASDAQ', () => {
      expect(normalizer.normalizeSymbol('^IXIC')).toBe('IXIC');
    });

    it('should handle already clean symbols', () => {
      expect(normalizer.normalizeSymbol('AAPL')).toBe('AAPL');
    });

    it('should uppercase symbols', () => {
      expect(normalizer.normalizeSymbol('aapl.l')).toBe('AAPL');
    });

    it('should trim whitespace', () => {
      expect(normalizer.normalizeSymbol('  AAPL.L  ')).toBe('AAPL');
    });
  });

  describe('normalize', () => {
    it('should produce correct normalized price', () => {
      const rawPrice = createMockPrice({ symbol: '^DJI', price: 37500.5 });
      const result = normalizer.normalize(rawPrice);

      expect(result.symbol).toBe('DJI');
      expect(result.price).toBe(37500.5);
      expect(result.source).toBe(NormalizedSource.YAHOO_FINANCE);
      expect(result.metadata.originalSymbol).toBe('^DJI');
    });
  });

  describe('normalizeMany', () => {
    it('should normalize multiple prices', () => {
      const prices = [
        createMockPrice({ symbol: 'AAPL.L' }),
        createMockPrice({ symbol: '^GSPC' }),
        createMockPrice({ symbol: 'BHP.AX' }),
      ];

      const results = normalizer.normalizeMany(prices);

      expect(results.length).toBe(3);
      expect(results[0].symbol).toBe('AAPL');
      expect(results[1].symbol).toBe('GSPC');
      expect(results[2].symbol).toBe('BHP');
    });
  });
});
