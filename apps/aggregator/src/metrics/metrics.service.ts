import { Injectable } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  collectDefaultMetrics,
} from 'prom-client';

/**
 * Service that registers and updates Prometheus metrics for the aggregator.
 * Exposes aggregation count, latency, and errors.
 */
@Injectable()
export class MetricsService {
  private readonly register: Registry;

  /** Total number of aggregation operations (single and batch) */
  readonly aggregationCount: Counter<string>;

  /** Latency of aggregation in seconds */
  readonly aggregationLatency: Histogram<string>;

  /** Total number of aggregation errors */
  readonly aggregationErrors: Counter<string>;

  /** Throughput: aggregations per symbol (optional dimension) */
  readonly aggregationsBySymbol: Counter<string>;

  constructor() {
    this.register = new Registry();
    this.aggregationCount = new Counter({
      name: 'aggregator_aggregations_total',
      help: 'Total number of aggregation operations',
      labelNames: ['method'],
      registers: [this.register],
    });
    this.aggregationLatency = new Histogram({
      name: 'aggregator_aggregation_duration_seconds',
      help: 'Aggregation operation duration in seconds',
      labelNames: ['method'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.register],
    });
    this.aggregationErrors = new Counter({
      name: 'aggregator_errors_total',
      help: 'Total number of aggregation errors',
      labelNames: ['method'],
      registers: [this.register],
    });
    this.aggregationsBySymbol = new Counter({
      name: 'aggregator_aggregations_by_symbol_total',
      help: 'Total aggregations per symbol',
      labelNames: ['symbol', 'method'],
      registers: [this.register],
    });
    collectDefaultMetrics({ register: this.register, prefix: 'aggregator_' });
  }

  /**
   * Record a successful aggregation with duration.
   */
  recordAggregation(method: string, symbol: string, durationSeconds: number): void {
    this.aggregationCount.inc({ method }, 1);
    this.aggregationLatency.observe({ method }, durationSeconds);
    this.aggregationsBySymbol.inc({ symbol, method }, 1);
  }

  /**
   * Record an aggregation error.
   */
  recordError(method: string): void {
    this.aggregationErrors.inc({ method }, 1);
  }

  /**
   * Get the Prometheus registry for scraping.
   */
  getRegister(): Registry {
    return this.register;
  }

  /**
   * Get metrics in Prometheus text format.
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Get content type for Prometheus exposition format.
   */
  getContentType(): string {
    return this.register.contentType;
  }
}
