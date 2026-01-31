import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';


@Injectable()
export class IngestorHealthIndicator extends HealthIndicator {
  private static readonly TIMEOUT_MS = 5000;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const baseUrl = this.configService.get<string>('INGESTOR_URL');
    if (!baseUrl) {
      return { [key]: { status: 'up', message: 'Ingestor not configured (skipped)' } };
    }

    const url = baseUrl.replace(/\/$/, '') + '/prices/raw';
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<unknown>(url, {
            timeout: IngestorHealthIndicator.TIMEOUT_MS,
            validateStatus: () => true,
          })
          .pipe(timeout(IngestorHealthIndicator.TIMEOUT_MS)),
      );
      if (response.status >= 200 && response.status < 400) {
        return { [key]: { status: 'up', message: 'Ingestor is reachable' } };
      }
      throw new HealthCheckError('Ingestor check failed', {
        [key]: { status: 'down', message: `HTTP ${response.status}` },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HealthCheckError('Ingestor check failed', {
        [key]: { status: 'down', message },
      });
    }
  }
}
