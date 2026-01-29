import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PriceFetcherService } from './price-fetcher.service';

describe('PriceFetcherService', () => {
  let service: PriceFetcherService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          STOCK_SYMBOLS: 'AAPL,GOOGL,MSFT',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceFetcherService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PriceFetcherService>(PriceFetcherService);
    configService = module.get(ConfigService);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should read symbols from config', () => {
      expect(configService.get).toHaveBeenCalledWith('STOCK_SYMBOLS', 'AAPL,GOOGL,MSFT,TSLA');
    });

    it('should parse symbols correctly', () => {
      expect(service.getSymbols()).toEqual(['AAPL', 'GOOGL', 'MSFT']);
    });
  });

  describe('fetchRawPrices', () => {
    it('should fetch prices for all configured symbols', async () => {
      const prices = await service.fetchRawPrices();

      expect(prices).toHaveLength(3); // One price per symbol from MockProvider
      expect(prices.map(p => p.symbol)).toEqual(['AAPL', 'GOOGL', 'MSFT']);
    });

    it('should return prices with correct structure', async () => {
      const prices = await service.fetchRawPrices();

      prices.forEach(price => {
        expect(price).toHaveProperty('symbol');
        expect(price).toHaveProperty('price');
        expect(price).toHaveProperty('timestamp');
        expect(price).toHaveProperty('source');
        expect(typeof price.symbol).toBe('string');
        expect(typeof price.price).toBe('number');
        expect(typeof price.timestamp).toBe('number');
        expect(price.source).toBe('MockProvider');
      });
    });

    it('should store fetched prices', async () => {
      expect(service.getRawPrices()).toHaveLength(0);

      await service.fetchRawPrices();

      expect(service.getRawPrices().length).toBeGreaterThan(0);
    });
  });

  describe('getRawPrices', () => {
    it('should return empty array initially', () => {
      expect(service.getRawPrices()).toEqual([]);
    });

    it('should return fetched prices', async () => {
      await service.fetchRawPrices();
      const prices = service.getRawPrices();

      expect(prices.length).toBeGreaterThan(0);
    });
  });

  describe('getSymbols', () => {
    it('should return configured symbols', () => {
      const symbols = service.getSymbols();

      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('GOOGL');
      expect(symbols).toContain('MSFT');
    });

    it('should return a copy of symbols array', () => {
      const symbols1 = service.getSymbols();
      const symbols2 = service.getSymbols();

      expect(symbols1).not.toBe(symbols2);
      expect(symbols1).toEqual(symbols2);
    });
  });

  describe('symbol parsing', () => {
    it('should handle symbols with extra whitespace', async () => {
      const mockConfigWithSpaces = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'STOCK_SYMBOLS') {
            return '  AAPL , GOOGL  , MSFT  ';
          }
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PriceFetcherService,
          { provide: ConfigService, useValue: mockConfigWithSpaces },
        ],
      }).compile();

      const serviceWithSpaces = module.get<PriceFetcherService>(PriceFetcherService);
      expect(serviceWithSpaces.getSymbols()).toEqual(['AAPL', 'GOOGL', 'MSFT']);
    });

    it('should filter out empty symbols', async () => {
      const mockConfigWithEmpty = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'STOCK_SYMBOLS') {
            return 'AAPL,,GOOGL,,,MSFT';
          }
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PriceFetcherService,
          { provide: ConfigService, useValue: mockConfigWithEmpty },
        ],
      }).compile();

      const serviceWithEmpty = module.get<PriceFetcherService>(PriceFetcherService);
      expect(serviceWithEmpty.getSymbols()).toEqual(['AAPL', 'GOOGL', 'MSFT']);
    });

    it('should use default symbols when env var is not set', async () => {
      const mockConfigDefault = {
        get: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PriceFetcherService,
          { provide: ConfigService, useValue: mockConfigDefault },
        ],
      }).compile();

      const serviceDefault = module.get<PriceFetcherService>(PriceFetcherService);
      expect(serviceDefault.getSymbols()).toEqual(['AAPL', 'GOOGL', 'MSFT', 'TSLA']);
    });
  });
});
