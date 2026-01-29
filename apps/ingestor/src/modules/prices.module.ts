import { Module } from '@nestjs/common';
import { PricesController } from '../controllers/prices.controller';
import { PriceFetcherService } from '../services/price-fetcher.service';
import { StockService } from '../services/stock.service';      
import { FinnhubAdapter } from '../providers/finnhub.adapter'; 

@Module({
  controllers: [PricesController],
  providers: [
    PriceFetcherService, 
    StockService,        
    FinnhubAdapter       
  ],
  exports: [PriceFetcherService, StockService], 
})
export class PricesModule {}
