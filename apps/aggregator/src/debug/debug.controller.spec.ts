import { Test, TestingModule } from '@nestjs/testing';
import { DebugController } from './debug.controller';
import { DebugService } from './debug.service';

describe('DebugController', () => {
  let controller: DebugController;
  let debugService: DebugService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DebugController],
      providers: [DebugService],
    }).compile();

    controller = module.get<DebugController>(DebugController);
    debugService = module.get<DebugService>(DebugService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /debug/prices', () => {
    it('should return last prices from DebugService', () => {
      const result = controller.getLastPrices();
      expect(result).toMatchObject({
        aggregated: expect.any(Object),
        normalized: expect.any(Object),
        updatedAt: expect.any(Number),
      });
      expect(result.aggregated).toEqual({});
      expect(result.normalized).toEqual({});
    });

    it('should return stored prices after they are set', () => {
      debugService.setLastAggregated('AAPL', {
        symbol: 'AAPL',
        price: 150.25,
        method: 'weighted-average',
        confidence: 95,
        metrics: {
          standardDeviation: 0.05,
          spread: 0.1,
          sourceCount: 3,
          variance: 0.0025,
        },
        startTimestamp: 0,
        endTimestamp: 0,
        sources: ['S1', 'S2', 'S3'],
        computedAt: Date.now(),
      });
      const result = controller.getLastPrices();
      expect(Object.keys(result.aggregated)).toContain('AAPL');
      expect(result.aggregated['AAPL'].price).toBe(150.25);
    });
  });
});
