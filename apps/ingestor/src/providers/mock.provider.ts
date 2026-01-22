import { RawPrice } from '@oracle-stocks/shared';
import { PriceProvider } from './provider.interface';

export class MockProvider implements PriceProvider {
  readonly name = 'MockProvider';

  async fetchPrices(symbols: string[]): Promise<RawPrice[]> {
    return symbols.map(symbol => ({
      symbol,
      price: this.generateMockPrice(),
      timestamp: Date.now(),
      source: this.name,
    }));
  }

  private generateMockPrice(): number {
    return parseFloat((Math.random() * 1000 + 50).toFixed(2));
  }
}
