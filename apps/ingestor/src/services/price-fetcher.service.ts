import { Injectable, Logger } from '@nestjs/common';

export interface RawPrice {
  symbol: string;
  price: number;
  timestamp: number;
  source: string;
}

@Injectable()
export class PriceFetcherService {
  private readonly logger = new Logger(PriceFetcherService.name);
  private rawPrices: RawPrice[] = [];

  async fetchRawPrices(): Promise<RawPrice[]> {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
    const sources = ['AlphaVantage', 'YahooFinance', 'Finnhub'];

    this.rawPrices = symbols.flatMap(symbol =>
      sources.map(source => ({
        symbol,
        price: this.generateMockPrice(),
        timestamp: Date.now(),
        source,
      }))
    );

    this.logger.log(`Fetched ${this.rawPrices.length} raw prices from external APIs`);
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

  private generateMockPrice(): number {
    return parseFloat((Math.random() * 1000 + 50).toFixed(2));
  }
}
