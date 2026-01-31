import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { IngestorHealthIndicator } from './indicators/ingestor.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  const mockRedisHealthy = {
    redis: { status: 'up' as const, message: 'Redis is reachable' },
  };
  const mockIngestorHealthy = {
    ingestor: { status: 'up' as const, message: 'Ingestor is reachable' },
  };
  const healthyResult: HealthCheckResult = {
    status: 'ok',
    info: { ...mockRedisHealthy, ...mockIngestorHealthy },
    error: {},
    details: { ...mockRedisHealthy, ...mockIngestorHealthy },
  };
  const unhealthyResult: HealthCheckResult = {
    status: 'error',
    info: {},
    error: mockRedisHealthy,
    details: { ...mockRedisHealthy },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: RedisHealthIndicator,
          useValue: { isHealthy: jest.fn().mockResolvedValue(mockRedisHealthy) },
        },
        {
          provide: IngestorHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue(mockIngestorHealthy),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    jest.mocked(healthCheckService.check).mockResolvedValue(healthyResult);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /health', () => {
    it('should return 200 and health result when all checks pass', async () => {
      const result = await controller.check();
      expect(result).toEqual(healthyResult);
      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should throw ServiceUnavailableException when a check fails', async () => {
      jest.mocked(healthCheckService.check).mockResolvedValue(unhealthyResult);
      await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('GET /ready', () => {
    it('should return 200 and health result when ready', async () => {
      const result = await controller.ready();
      expect(result).toEqual(healthyResult);
      expect(result.status).toBe('ok');
    });

    it('should throw ServiceUnavailableException when not ready', async () => {
      jest.mocked(healthCheckService.check).mockResolvedValue(unhealthyResult);
      await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('GET /live', () => {
    it('should return 200 with status ok', () => {
      const result = controller.live();
      expect(result).toEqual({ status: 'ok' });
    });

    it('should not call any health indicators', () => {
      controller.live();
      expect(healthCheckService.check).not.toHaveBeenCalled();
    });
  });

  describe('GET /status', () => {
    it('should return detailed status with uptime, memory, and checks', async () => {
      const result = await controller.status();
      expect(result).toMatchObject({
        status: 'ok',
        checks: healthyResult,
      });
      expect(typeof result.uptimeSeconds).toBe('number');
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(typeof result.timestamp).toBe('number');
      expect(result.version).toBeDefined();
      expect(result.memory).toMatchObject({
        rss: expect.any(Number),
        heapTotal: expect.any(Number),
        heapUsed: expect.any(Number),
        external: expect.any(Number),
        arrayBuffers: expect.any(Number),
      });
    });
  });
});
