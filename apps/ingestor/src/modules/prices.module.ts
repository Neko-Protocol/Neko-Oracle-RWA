import { Module } from '@nestjs/common';
import { PricesController } from '../controllers/prices.controller';
import { PriceFetcherService } from '../services/price-fetcher.service';
import { SchedulerService } from '../services/scheduler.service';

@Module({
  controllers: [PricesController],
  providers: [PriceFetcherService, SchedulerService],
  exports: [PriceFetcherService, SchedulerService],
})
export class PricesModule {}
