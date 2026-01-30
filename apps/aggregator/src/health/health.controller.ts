import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health';
import { IngestorHealthIndicator } from './indicators/ingestor.health';

/** Start time for uptime calculation */
const startTime = Date.now();

/**
 * Health controller providing endpoints for Kubernetes probes and observability.
 *
 * - GET /health  - Full health check (Redis, Ingestor). Returns 200 if OK, 503 if any dependency is down.
 * - GET /ready   - Readiness probe. Returns 200 when the service can accept traffic.
 * - GET /live    - Liveness probe. Returns 200 when the process is alive.
 * - GET /status  - Detailed system information for debugging.
 */
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
    private readonly ingestor: IngestorHealthIndicator,
  ) {}

  /**
   * Full health check. Verifies connectivity to Redis (if configured) and Ingestor (if configured).
   * Returns 200 if all configured dependencies are healthy, 503 otherwise.
   */
  @Get('health')
  @HealthCheck()
  @HttpCode(HttpStatus.OK)
  async check(): Promise<HealthCheckResult> {
    const result = await this.health.check([
      () => this.redis.isHealthy('redis'),
      () => this.ingestor.isHealthy('ingestor'),
    ]);
    if (result.status === 'ok') {
      return result;
    }
    throw new ServiceUnavailableException(result);
  }

  /**
   * Readiness probe. Used by Kubernetes to determine if the pod can receive traffic.
   * Runs the same checks as /health.
   */
  @Get('ready')
  @HealthCheck()
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<HealthCheckResult> {
    const result = await this.health.check([
      () => this.redis.isHealthy('redis'),
      () => this.ingestor.isHealthy('ingestor'),
    ]);
    if (result.status === 'ok') {
      return result;
    }
    throw new ServiceUnavailableException(result);
  }

  /**
   * Liveness probe. Used by Kubernetes to determine if the pod should be restarted.
   * Returns 200 if the process is running (no dependency checks).
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Detailed status endpoint with system information for debugging.
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  async status(): Promise<{
    status: string;
    uptimeSeconds: number;
    timestamp: number;
    version: string;
    memory: NodeJS.MemoryUsage;
    checks: HealthCheckResult;
  }> {
    const checks = await this.health.check([
      () => this.redis.isHealthy('redis'),
      () => this.ingestor.isHealthy('ingestor'),
    ]);
    return {
      status: checks.status,
      uptimeSeconds: (Date.now() - startTime) / 1000,
      timestamp: Date.now(),
      version: process.env.npm_package_version ?? '0.0.0',
      memory: process.memoryUsage(),
      checks,
    };
  }
}
