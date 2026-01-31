import { Injectable } from '@nestjs/common';
import { AggregatedPrice } from '../interfaces/aggregated-price.interface';
import { NormalizedPrice } from '../interfaces/normalized-price.interface';

export interface LastPricesDto {
  aggregated: Record<string, AggregatedPrice>;
  normalized: Record<string, NormalizedPrice[]>;
  updatedAt: number;
}

/**
 * In-memory store for last aggregated and normalized prices, used by the debug endpoint.
 */
@Injectable()
export class DebugService {
  private lastAggregated: Map<string, AggregatedPrice> = new Map();
  private lastNormalized: Map<string, NormalizedPrice[]> = new Map();
  private updatedAt = 0;

  /**
   * Record an aggregated result for a symbol (called by aggregation flow).
   */
  setLastAggregated(symbol: string, result: AggregatedPrice): void {
    this.lastAggregated.set(symbol, result);
    this.updatedAt = Date.now();
  }

  /**
   * Record normalized prices for a symbol (called before aggregation).
   */
  setLastNormalized(symbol: string, prices: NormalizedPrice[]): void {
    this.lastNormalized.set(symbol, [...prices]);
    this.updatedAt = Date.now();
  }

  /**
   * Get last aggregated and normalized prices for the debug endpoint.
   */
  getLastPrices(): LastPricesDto {
    const aggregated: Record<string, AggregatedPrice> = {};
    for (const [symbol, value] of this.lastAggregated) {
      aggregated[symbol] = value;
    }
    const normalized: Record<string, NormalizedPrice[]> = {};
    for (const [symbol, value] of this.lastNormalized) {
      normalized[symbol] = value;
    }
    return {
      aggregated,
      normalized,
      updatedAt: this.updatedAt,
    };
  }
}
