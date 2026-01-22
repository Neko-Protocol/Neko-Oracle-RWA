import { Controller, Get, Logger } from '@nestjs/common';
import { RawPrice } from '@oracle-stocks/shared';
import { PriceFetcherService } from '../services/price-fetcher.service';

@Controller('prices')
export class PricesController {
  private readonly logger = new Logger(PricesController.name);

  constructor(private readonly priceFetcherService: PriceFetcherService) {}

  @Get('raw')
  async getRawPrices(): Promise<RawPrice[]> {
    this.logger.log('GET /prices/raw endpoint called');
    await this.priceFetcherService.fetchRawPrices();
    const rawPrices = this.priceFetcherService.getRawPrices();
    this.logger.log(`Returning ${rawPrices.length} raw prices`);
    return rawPrices;
  }
}
