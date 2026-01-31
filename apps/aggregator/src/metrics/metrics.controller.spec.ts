import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: {
            getMetrics: jest.fn().mockResolvedValue('# HELP dummy\n# TYPE dummy counter\ndummy 0'),
            getContentType: jest.fn().mockReturnValue('text/plain; version=0.0.4; charset=utf-8'),
          },
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics from MetricsService', async () => {
      const result = await controller.getMetrics();
      expect(result).toContain('# HELP dummy');
      expect(metricsService.getMetrics).toHaveBeenCalled();
    });
  });
});
