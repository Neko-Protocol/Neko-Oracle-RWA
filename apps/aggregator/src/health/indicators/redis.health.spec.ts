import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  it('should return up with "not configured" when REDIS_URL is not set', async () => {
    jest.mocked(configService.get).mockReturnValue(undefined);
    const result = await indicator.isHealthy('redis');
    expect(result).toEqual({
      redis: { status: 'up', message: 'Redis not configured (skipped)' },
    });
  });

  it('should return up with "not configured" when REDIS_URL is empty string', async () => {
    jest.mocked(configService.get).mockReturnValue('');
    const result = await indicator.isHealthy('redis');
    expect(result).toEqual({
      redis: { status: 'up', message: 'Redis not configured (skipped)' },
    });
  });

  it('should check Redis when REDIS_URL is set', async () => {
    jest.mocked(configService.get).mockReturnValue('redis://localhost:6379');
    try {
      const result = await indicator.isHealthy('redis');
      expect(result.redis).toBeDefined();
      expect(result.redis.status).toBe('up');
    } catch (err) {
      expect(err).toBeInstanceOf(HealthCheckError);
      expect((err as HealthCheckError).causes).toBeDefined();
    }
  });
});
