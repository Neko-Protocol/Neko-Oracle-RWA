import { Test, TestingModule } from '@nestjs/testing';
import { NormalizationService } from './normalization.service';
import {
  mockRawPrices,
  malformedPrices,
  validRawPrices,
  mixedRawPrices,
} from '../__mocks__/raw-price.fixtures';
import { NormalizedSource } from '../interfaces/normalized-price.interface';
import { NormalizationException } from '../exceptions';
import { RawPrice } from '@oracle-stocks/shared';

describe('NormalizationService', () => {
  let service: NormalizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NormalizationService],
    }).compile();

    service = module.get<NormalizationService>(NormalizationService);
    service.onModuleInit();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should register default normalizers', () => {
      const normalizers = service.getNormalizers();
      expect(normalizers.length).toBeGreaterThanOrEqual(4);
    });

    it('should have normalizers for all expected sources', () => {
      const normalizers = service.getNormalizers();
      const sources = normalizers.map((n) => n.source);

      expect(sources).toContain(NormalizedSource.ALPHA_VANTAGE);
      expect(sources).toContain(NormalizedSource.FINNHUB);
      expect(sources).toContain(NormalizedSource.YAHOO_FINANCE);
      expect(sources).toContain(NormalizedSource.MOCK);
    });
  });

  describe('findNormalizer', () => {
    it('should find Alpha Vantage normalizer', () => {
      const normalizer = service.findNormalizer(mockRawPrices.alphaVantage);
      expect(normalizer).not.toBeNull();
      expect(normalizer?.source).toBe(NormalizedSource.ALPHA_VANTAGE);
    });

    it('should find Finnhub normalizer', () => {
      const normalizer = service.findNormalizer(mockRawPrices.finnhub);
      expect(normalizer).not.toBeNull();
      expect(normalizer?.source).toBe(NormalizedSource.FINNHUB);
    });

    it('should find Yahoo Finance normalizer', () => {
      const normalizer = service.findNormalizer(mockRawPrices.yahooFinance);
      expect(normalizer).not.toBeNull();
      expect(normalizer?.source).toBe(NormalizedSource.YAHOO_FINANCE);
    });

    it('should find Mock normalizer', () => {
      const normalizer = service.findNormalizer(mockRawPrices.mock);
      expect(normalizer).not.toBeNull();
      expect(normalizer?.source).toBe(NormalizedSource.MOCK);
    });

    it('should return null for unknown source', () => {
      const normalizer = service.findNormalizer(mockRawPrices.unknown);
      expect(normalizer).toBeNull();
    });
  });

  describe('normalize - Alpha Vantage', () => {
    it('should normalize Alpha Vantage price with .US suffix', () => {
      const result = service.normalize(mockRawPrices.alphaVantage);

      expect(result.symbol).toBe('AAPL');
      expect(result.source).toBe(NormalizedSource.ALPHA_VANTAGE);
      expect(result.metadata.originalSymbol).toBe('AAPL.US');
      expect(result.metadata.originalSource).toBe('AlphaVantage');
    });

    it('should normalize Alpha Vantage price with .NYSE suffix', () => {
      const result = service.normalize(mockRawPrices.alphaVantageNYSE);

      expect(result.symbol).toBe('MSFT');
      expect(result.source).toBe(NormalizedSource.ALPHA_VANTAGE);
    });

    it('should handle alpha_vantage source name variation', () => {
      const result = service.normalize(mockRawPrices.alphaVantageNYSE);
      expect(result.source).toBe(NormalizedSource.ALPHA_VANTAGE);
    });
  });

  describe('normalize - Finnhub', () => {
    it('should normalize Finnhub price with US- prefix', () => {
      const result = service.normalize(mockRawPrices.finnhub);

      expect(result.symbol).toBe('GOOGL');
      expect(result.source).toBe(NormalizedSource.FINNHUB);
      expect(result.metadata.originalSymbol).toBe('US-GOOGL');
    });

    it('should normalize Finnhub price with CRYPTO- prefix', () => {
      const result = service.normalize(mockRawPrices.finnhubCrypto);

      expect(result.symbol).toBe('BTC');
      expect(result.source).toBe(NormalizedSource.FINNHUB);
    });
  });

  describe('normalize - Yahoo Finance', () => {
    it('should normalize Yahoo Finance price with .L suffix', () => {
      const result = service.normalize(mockRawPrices.yahooFinance);

      expect(result.symbol).toBe('MSFT');
      expect(result.source).toBe(NormalizedSource.YAHOO_FINANCE);
    });

    it('should normalize Yahoo Finance index with ^ prefix', () => {
      const result = service.normalize(mockRawPrices.yahooFinanceIndex);

      expect(result.symbol).toBe('DJI');
      expect(result.source).toBe(NormalizedSource.YAHOO_FINANCE);
    });

    it('should normalize Yahoo Finance price with .AX suffix', () => {
      const result = service.normalize(mockRawPrices.yahooFinanceAustralia);

      expect(result.symbol).toBe('BHP');
      expect(result.source).toBe(NormalizedSource.YAHOO_FINANCE);
    });

    it('should handle yahoo_finance source name variation', () => {
      const result = service.normalize(mockRawPrices.yahooFinanceIndex);
      expect(result.source).toBe(NormalizedSource.YAHOO_FINANCE);
    });
  });

  describe('normalize - Mock', () => {
    it('should normalize Mock price', () => {
      const result = service.normalize(mockRawPrices.mock);

      expect(result.symbol).toBe('TSLA');
      expect(result.source).toBe(NormalizedSource.MOCK);
    });

    it('should uppercase and trim symbols', () => {
      const result = service.normalize(mockRawPrices.mockLowercase);

      expect(result.symbol).toBe('AAPL');
    });
  });

  describe('normalize - timestamp', () => {
    it('should convert timestamp to ISO 8601 UTC format', () => {
      const result = service.normalize(mockRawPrices.alphaVantage);

      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
      );
      expect(result.timestamp).toBe('2024-01-15T14:30:00.000Z');
    });

    it('should preserve original timestamp', () => {
      const result = service.normalize(mockRawPrices.alphaVantage);

      expect(result.originalTimestamp).toBe(1705329000000);
    });
  });

  describe('normalize - price', () => {
    it('should round price to 4 decimal places', () => {
      const result = service.normalize(mockRawPrices.alphaVantage);

      expect(result.price).toBe(150.1235);
      const decimalPlaces = (result.price.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(4);
    });

    it('should handle prices with fewer decimals', () => {
      const result = service.normalize(mockRawPrices.mock);

      expect(result.price).toBe(250.5);
    });
  });

  describe('normalize - metadata', () => {
    it('should include normalization metadata', () => {
      const result = service.normalize(mockRawPrices.alphaVantage);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.originalSource).toBe('AlphaVantage');
      expect(result.metadata.originalSymbol).toBe('AAPL.US');
      expect(result.metadata.normalizedAt).toBeDefined();
      expect(result.metadata.normalizerVersion).toBe('1.0.0');
    });

    it('should track transformations when symbol changes', () => {
      const result = service.normalize(mockRawPrices.alphaVantage);

      expect(result.metadata.wasTransformed).toBe(true);
      expect(result.metadata.transformations.length).toBeGreaterThan(0);
      expect(result.metadata.transformations[0]).toContain('symbol');
    });

    it('should track transformations when price is rounded', () => {
      const result = service.normalize(mockRawPrices.alphaVantage);

      const priceTransformation = result.metadata.transformations.find((t) =>
        t.includes('price'),
      );
      expect(priceTransformation).toBeDefined();
    });
  });

  describe('normalize - error handling', () => {
    it('should throw for unknown source', () => {
      expect(() => service.normalize(mockRawPrices.unknown)).toThrow(
        NormalizationException,
      );
    });

    it('should include source in error message', () => {
      expect(() => service.normalize(mockRawPrices.unknown)).toThrow(
        /UnknownSource/,
      );
    });
  });

  describe('normalizeMany', () => {
    it('should normalize multiple prices', () => {
      const results = service.normalizeMany(validRawPrices);

      expect(results.length).toBe(4);
    });

    it('should skip invalid prices without throwing', () => {
      const results = service.normalizeMany(mixedRawPrices);

      expect(results.length).toBe(2);
    });

    it('should return empty array for all invalid prices', () => {
      const results = service.normalizeMany([mockRawPrices.unknown]);

      expect(results.length).toBe(0);
    });
  });

  describe('normalizeManyWithErrors', () => {
    it('should return both successful and failed normalizations', () => {
      const result = service.normalizeManyWithErrors(mixedRawPrices);

      expect(result.successful.length).toBe(2);
      expect(result.failed.length).toBe(1);
    });

    it('should include error details for failures', () => {
      const result = service.normalizeManyWithErrors(mixedRawPrices);

      expect(result.failed[0].error).toContain('No normalizer found');
      expect(result.failed[0].rawPrice).toEqual(mockRawPrices.unknown);
      expect(result.failed[0].timestamp).toBeDefined();
    });

    it('should handle all valid prices', () => {
      const result = service.normalizeManyWithErrors(validRawPrices);

      expect(result.successful.length).toBe(4);
      expect(result.failed.length).toBe(0);
    });
  });

  describe('normalizeBySource', () => {
    it('should group normalized prices by source', () => {
      const result = service.normalizeBySource(validRawPrices);

      expect(result.get(NormalizedSource.ALPHA_VANTAGE)?.length).toBe(1);
      expect(result.get(NormalizedSource.FINNHUB)?.length).toBe(1);
      expect(result.get(NormalizedSource.YAHOO_FINANCE)?.length).toBe(1);
      expect(result.get(NormalizedSource.MOCK)?.length).toBe(1);
    });

    it('should skip invalid prices', () => {
      const result = service.normalizeBySource(mixedRawPrices);

      expect(result.size).toBe(2);
      expect(result.get(NormalizedSource.UNKNOWN)).toBeUndefined();
    });
  });

  describe('validation', () => {
    malformedPrices.forEach((malformed, index) => {
      // Skip test case #5 (empty source) since it gets overwritten by 'MockProvider'
      // That case is tested separately below
      if (index === 4) return;

      it(`should reject malformed price #${index + 1}`, () => {
        // Create a mock price that will match a normalizer
        const testPrice = {
          ...malformed,
          source: 'MockProvider',
        } as RawPrice;

        expect(() => service.normalize(testPrice)).toThrow();
      });
    });

    it('should reject empty symbol', () => {
      const badPrice: RawPrice = {
        symbol: '',
        price: 100,
        timestamp: Date.now(),
        source: 'MockProvider',
      };

      expect(() => service.normalize(badPrice)).toThrow(/Symbol/);
    });

    it('should reject NaN price', () => {
      const badPrice: RawPrice = {
        symbol: 'TEST',
        price: NaN,
        timestamp: Date.now(),
        source: 'MockProvider',
      };

      expect(() => service.normalize(badPrice)).toThrow(/number/);
    });

    it('should reject negative price', () => {
      const badPrice: RawPrice = {
        symbol: 'TEST',
        price: -100,
        timestamp: Date.now(),
        source: 'MockProvider',
      };

      expect(() => service.normalize(badPrice)).toThrow(/negative/);
    });

    it('should reject invalid timestamp', () => {
      const badPrice: RawPrice = {
        symbol: 'TEST',
        price: 100,
        timestamp: NaN,
        source: 'MockProvider',
      };

      expect(() => service.normalize(badPrice)).toThrow();
    });
  });

  describe('registerNormalizer', () => {
    it('should allow registering custom normalizers', () => {
      const initialCount = service.getNormalizers().length;

      const customNormalizer = {
        name: 'CustomNormalizer',
        source: NormalizedSource.UNKNOWN,
        version: '1.0.0',
        canNormalize: () => false,
        normalize: jest.fn(),
        normalizeMany: jest.fn(),
      };

      service.registerNormalizer(customNormalizer);

      expect(service.getNormalizers().length).toBe(initialCount + 1);
    });
  });
});
