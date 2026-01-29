import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RawPrice } from '@oracle-stocks/shared';
import { PriceProvider, MockProvider } from '../providers';

@Injectable()
export class PriceFetcherService {
  private readonly logger = new Logger(PriceFetcherService.name);
  private rawPrices: RawPrice[] = [];
  private readonly providers: PriceProvider[] = [];
  private readonly symbols: string[];

  constructor(private readonly configService: ConfigService) {
    this.providers.push(new MockProvider());

    const symbolsEnv = this.configService.get<string>('STOCK_SYMBOLS', 'AAPL,GOOGL,MSFT,TSLA');
    this.symbols = symbolsEnv
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    this.logger.log(`Configured symbols: ${this.symbols.join(', ')}`);
  }

  async fetchRawPrices(): Promise<RawPrice[]> {
    const pricePromises = this.providers.map(provider => provider.fetchPrices(this.symbols));
    const results = await Promise.all(pricePromises);
    this.rawPrices = results.flat();

    this.logger.log(`Fetched ${this.rawPrices.length} raw prices from ${this.providers.length} provider(s)`);
    this.rawPrices.forEach(price => {
      this.logger.debug(
        `${price.source} - ${price.symbol}: $${price.price.toFixed(2)} at ${new Date(price.timestamp).toISOString()}`,
      );
    });

    return this.rawPrices;
  }

  getRawPrices(): RawPrice[] {
    return this.rawPrices;
  }

  getSymbols(): string[] {
    return [...this.symbols];
  }
}
