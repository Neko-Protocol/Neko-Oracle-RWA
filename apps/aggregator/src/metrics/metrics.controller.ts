import { Controller, Get, Header, HttpCode, HttpStatus } from '@nestjs/common';
import { MetricsService } from './metrics.service';

/**
 * Metrics controller exposing Prometheus metrics.
 *
 * - GET /metrics - Returns metrics in Prometheus exposition format for scraping.
 */
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus metrics endpoint. Returns metrics in text format for Prometheus server to scrape.
   */
  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
