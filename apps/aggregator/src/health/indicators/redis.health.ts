import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import Redis from 'ioredis';
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      return { [key]: { status: 'up', message: 'Redis not configured (skipped)' } };
    }

    let redis: Redis | null = null;
    try {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        lazyConnect: true,
      });
      await redis.connect();
      const pong = await redis.ping();
      await redis.quit();
      if (pong === 'PONG') {
        return { [key]: { status: 'up', message: 'Redis is reachable' } };
      }
      throw new HealthCheckError('Redis check failed', {
        [key]: { status: 'down', message: 'PING did not return PONG' },
      });
    } catch (err) {
      if (redis) {
        try {
          redis.disconnect();
        } catch {
          // ignore
        }
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HealthCheckError('Redis check failed', {
        [key]: { status: 'down', message },
      });
    }
  }
}
