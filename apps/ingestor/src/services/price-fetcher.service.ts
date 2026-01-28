import { Injectable, Logger } from '@nestjs/common';
import { RawPrice } from '@oracle-stocks/shared';
import { PriceProvider, MockProvider } from '../providers';

@Injectable()
export class PriceFetcherService {
  private readonly logger = new Logger(PriceFetcherService.name);
  private rawPrices: RawPrice[] = [];
  private readonly providers: PriceProvider[] = [];

  constructor() {
    this.providers.push(new MockProvider());
  }

  async fetchRawPrices(): Promise<RawPrice[]> {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];

    const pricePromises = this.providers.map(provider => provider.fetchPrices(symbols));
    const results = await Promise.all(pricePromises);
    this.rawPrices = results.flat();

    this.logger.log(`Fetched ${this.rawPrices.length} raw prices from ${this.providers.length} provider(s)`);
    this.rawPrices.forEach(price => {
      this.logger.debug(
        `${price.source} - ${price.symbol}: $${price.price.toFixed(2)} at ${new Date(price.timestamp).toISOString()}`
      );
    });

    return this.rawPrices;
  }

  getRawPrices(): RawPrice[] {
    return this.rawPrices;
  }
}
