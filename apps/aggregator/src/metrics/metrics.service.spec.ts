import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordAggregation', () => {
    it('should record aggregation count and latency', async () => {
      service.recordAggregation('weighted-average', 'AAPL', 0.05);
      service.recordAggregation('weighted-average', 'AAPL', 0.1);
      service.recordAggregation('median', 'GOOGL', 0.02);

      const metrics = await service.getMetrics();
      expect(metrics).toContain('aggregator_aggregations_total');
      expect(metrics).toContain('aggregator_aggregation_duration_seconds');
      expect(metrics).toContain('aggregator_aggregations_by_symbol_total');
      expect(metrics).toContain('method="weighted-average"');
      expect(metrics).toContain('method="median"');
      expect(metrics).toContain('symbol="AAPL"');
      expect(metrics).toContain('symbol="GOOGL"');
    });
  });

  describe('recordError', () => {
    it('should record aggregation errors', async () => {
      service.recordError('weighted-average');
      service.recordError('weighted-average');
      service.recordError('median');

      const metrics = await service.getMetrics();
      expect(metrics).toContain('aggregator_errors_total');
      expect(metrics).toContain('method="weighted-average"');
      expect(metrics).toContain('method="median"');
    });
  });

  describe('getMetrics', () => {
    it('should return Prometheus text format', async () => {
      const metrics = await service.getMetrics();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
      // Default Node.js metrics are also collected
      expect(
        metrics.includes('aggregator_') || metrics.includes('# HELP'),
      ).toBe(true);
    });
  });

  describe('getContentType', () => {
    it('should return Prometheus exposition content type', () => {
      const contentType = service.getContentType();
      expect(contentType).toContain('text/plain');
      expect(contentType).toContain('charset=utf-8');
    });
  });

  describe('getRegister', () => {
    it('should return the Prometheus registry', () => {
      const register = service.getRegister();
      expect(register).toBeDefined();
      expect(register.metrics).toBeDefined();
      expect(typeof register.metrics).toBe('function');
    });
  });
});
