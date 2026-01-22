import { Module } from '@nestjs/common';
import { PricesController } from '../controllers/prices.controller';
import { PriceFetcherService } from '../services/price-fetcher.service';

@Module({
  controllers: [PricesController],
  providers: [PriceFetcherService],
  exports: [PriceFetcherService],
})
export class PricesModule {}
