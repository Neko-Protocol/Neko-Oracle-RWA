import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PriceFetcherService } from './price-fetcher.service';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private readonly fetchIntervalMs: number;
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly priceFetcherService: PriceFetcherService,
  ) {
    this.fetchIntervalMs = this.configService.get<number>('FETCH_INTERVAL_MS', 60000);
  }

  onModuleInit(): void {
    this.startScheduler();
  }

  onModuleDestroy(): void {
    this.stopScheduler();
  }

  startScheduler(): void {
    if (this.isRunning) {
      this.logger.warn('Scheduler is already running');
      return;
    }

    this.logger.log(`Starting price fetch scheduler with interval: ${this.fetchIntervalMs}ms`);

    // Execute immediately on startup
    this.executeFetch();

    // Then schedule periodic fetches
    this.intervalId = setInterval(() => {
      this.executeFetch();
    }, this.fetchIntervalMs);

    this.isRunning = true;
    this.logger.log('Price fetch scheduler started successfully');
  }

  stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      this.logger.log('Price fetch scheduler stopped');
    }
  }

  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  getIntervalMs(): number {
    return this.fetchIntervalMs;
  }

  private async executeFetch(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Scheduled price fetch starting...');

    try {
      const prices = await this.priceFetcherService.fetchRawPrices();
      const duration = Date.now() - startTime;

      this.logger.log(
        `Scheduled price fetch completed successfully: ${prices.length} prices fetched in ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Scheduled price fetch failed after ${duration}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
