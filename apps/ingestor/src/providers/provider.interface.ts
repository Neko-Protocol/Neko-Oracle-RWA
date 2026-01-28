import { RawPrice } from '@oracle-stocks/shared';

export interface PriceProvider {
  readonly name: string;
  fetchPrices(symbols: string[]): Promise<RawPrice[]>;
}
