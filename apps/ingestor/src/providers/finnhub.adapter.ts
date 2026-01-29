import { Injectable } from '@nestjs/common';
import { NormalizedStockPrice } from '@oracle-stocks/shared';

@Injectable()
export class FinnhubAdapter {
  private readonly baseUrl = 'https://finnhub.io/api/v1';
  private readonly apiKey = process.env.FINNHUB_API_KEY;

  async getLatestPrice(symbol: string): Promise<NormalizedStockPrice> {
    const response = await fetch(
      `${this.baseUrl}/quote?symbol=${symbol.toUpperCase()}&token=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.statusText}`);
    }
    

    const data = await response.json();

    
    if (!data.c || data.c === 0) {
      throw new Error(`No se encontró precio real para el símbolo: ${symbol}`);
    }

    return {
      source: 'Finnhub',
      symbol: symbol.toUpperCase(),
      price: Number(data.c),
      timestamp: Date.now(),
    };
  }
}