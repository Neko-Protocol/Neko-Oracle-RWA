import { Injectable } from '@nestjs/common';
import { FinnhubAdapter } from '../providers/finnhub.adapter';
import { NormalizedStockPrice } from '@oracle-stocks/shared';

@Injectable()
export class StockService {
  
  constructor(private readonly finnhubAdapter: FinnhubAdapter) {}

  async getLatestPrice(symbol: string): Promise<NormalizedStockPrice> {
    return await this.finnhubAdapter.getLatestPrice(symbol);
  }
}