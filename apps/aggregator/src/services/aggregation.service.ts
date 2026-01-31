import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { NormalizedPrice } from '../interfaces/normalized-price.interface';
import { AggregatedPrice } from '../interfaces/aggregated-price.interface';
import { IAggregator } from '../interfaces/aggregator.interface';
import { WeightedAverageAggregator } from '../strategies/aggregators/weighted-average.aggregator';
import { MedianAggregator } from '../strategies/aggregators/median.aggregator';
import { TrimmedMeanAggregator } from '../strategies/aggregators/trimmed-mean.aggregator';
import { getSourceWeight } from '../config/source-weights.config';
import { MetricsService } from '../metrics/metrics.service';
import { DebugService } from '../debug/debug.service';

/**
 * Configuration options for the aggregation service
 */
export interface AggregationOptions {
  /** Minimum number of sources required (default: 3) */
  minSources?: number;
  
  /** Time window in milliseconds (default: 30000) */
  timeWindowMs?: number;
  
  /** Aggregation method to use */
  method?: 'weighted-average' | 'median' | 'trimmed-mean';
  
  /** Custom weights per source (overrides config) */
  customWeights?: Map<string, number>;
  
  /** Trim percentage for trimmed-mean (default: 0.2) */
  trimPercentage?: number;
}

/**
 * Aggregation Service
 * 
 * Core service that calculates consensus prices from multiple sources.
 * Supports multiple aggregation strategies and provides confidence metrics.
 */
@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);
  private readonly aggregators: Map<string, IAggregator>;

  constructor(
    @Optional() private readonly metricsService?: MetricsService,
    @Optional() private readonly debugService?: DebugService,
  ) {
    // Initialize all aggregation strategies
    this.aggregators = new Map<string, IAggregator>();
    this.aggregators.set('weighted-average', new WeightedAverageAggregator());
    this.aggregators.set('median', new MedianAggregator());
    this.aggregators.set('trimmed-mean', new TrimmedMeanAggregator(0.2));
  }

  /**
   * Aggregate prices for a specific symbol
   * 
   * @param symbol Trading symbol (e.g., AAPL, GOOGL)
   * @param prices Array of normalized prices from different sources
   * @param options Configuration options for aggregation
   * @returns Aggregated price with confidence metrics
   * @throws Error if insufficient sources or invalid data
   */
  aggregate(
    symbol: string,
    prices: NormalizedPrice[],
    options: AggregationOptions = {},
  ): AggregatedPrice {
    const startTime = Date.now();
    const method: 'weighted-average' | 'median' | 'trimmed-mean' =
      options.method ?? 'weighted-average';
    const {
      minSources = 3,
      timeWindowMs = 30000,
      customWeights,
      trimPercentage = 0.2,
    } = options;

    try {
      // Validate inputs
      this.validateInputs(symbol, prices, minSources);

      // Filter prices within time window
      const now = Date.now();
      const windowStart = now - timeWindowMs;
      const recentPrices = prices.filter(p => p.timestamp >= windowStart);

      // Check minimum sources after filtering
      if (recentPrices.length < minSources) {
        throw new Error(
          `Insufficient recent sources for ${symbol}. Required: ${minSources}, Found: ${recentPrices.length}`,
        );
      }

      // Get aggregator strategy
      let aggregator = this.aggregators.get(method);

      // Special handling for trimmed-mean with custom percentage
      if (method === 'trimmed-mean' && trimPercentage !== 0.2) {
        aggregator = new TrimmedMeanAggregator(trimPercentage);
      }

      if (!aggregator) {
        throw new Error(`Unknown aggregation method: ${method}`);
      }

      // Prepare weights
      const weights = this.prepareWeights(recentPrices, customWeights);

      // Calculate consensus price
      const consensusPrice = aggregator.aggregate(recentPrices, weights);

      // Calculate confidence metrics
      const metrics = this.calculateMetrics(recentPrices);

      // Calculate confidence score (0-100)
      const confidence = this.calculateConfidence(metrics, recentPrices.length);

      // Get time range
      const timestamps = recentPrices.map(p => p.timestamp);
      const startTimestamp = Math.min(...timestamps);
      const endTimestamp = Math.max(...timestamps);

      // Get unique sources
      const sources = [...new Set(recentPrices.map(p => p.source))];

      const result: AggregatedPrice = {
        symbol,
        price: consensusPrice,
        method,
        confidence,
        metrics: {
          ...metrics,
          sourceCount: recentPrices.length,
        },
        startTimestamp,
        endTimestamp,
        sources,
        computedAt: Date.now(),
      };

      this.logger.log(
        `Aggregated ${symbol}: $${consensusPrice.toFixed(2)} ` +
          `(method: ${method}, confidence: ${confidence.toFixed(1)}%, sources: ${sources.length})`,
      );

      this.debugService?.setLastNormalized(symbol, recentPrices);
      this.debugService?.setLastAggregated(symbol, result);
      this.metricsService?.recordAggregation(
        method,
        symbol,
        (Date.now() - startTime) / 1000,
      );
      return result;
    } catch (err) {
      this.metricsService?.recordError(method);
      throw err;
    }
  }

  /**
   * Aggregate prices for multiple symbols
   * 
   * @param pricesBySymbol Map of symbol to array of normalized prices
   * @param options Configuration options
   * @returns Map of symbol to aggregated price
   */
  aggregateMultiple(
    pricesBySymbol: Map<string, NormalizedPrice[]>,
    options: AggregationOptions = {},
  ): Map<string, AggregatedPrice> {
    const results = new Map<string, AggregatedPrice>();

    for (const [symbol, prices] of pricesBySymbol.entries()) {
      try {
        const aggregated = this.aggregate(symbol, prices, options);
        results.set(symbol, aggregated);
      } catch (error) {
        this.logger.error(
          `Failed to aggregate ${symbol}: ${error.message}`,
        );
      }
    }

    return results;
  }

  /**
   * Validate input parameters
   */
  private validateInputs(
    symbol: string,
    prices: NormalizedPrice[],
    minSources: number,
  ): void {
    if (!symbol || symbol.trim() === '') {
      throw new Error('Symbol cannot be empty');
    }

    if (!prices || prices.length === 0) {
      throw new Error('Prices array cannot be empty');
    }

    if (minSources < 1) {
      throw new Error('Minimum sources must be at least 1');
    }

    if (prices.length < minSources) {
      throw new Error(
        `Insufficient sources for ${symbol}. Required: ${minSources}, Found: ${prices.length}`,
      );
    }

    // Validate all prices are for the same symbol
    const invalidPrices = prices.filter(p => p.symbol !== symbol);
    if (invalidPrices.length > 0) {
      throw new Error(
        `All prices must be for symbol ${symbol}, found ${invalidPrices.length} mismatched`,
      );
    }

    // Validate price values
    const invalidValues = prices.filter(p => !isFinite(p.price) || p.price <= 0);
    if (invalidValues.length > 0) {
      throw new Error(`Found ${invalidValues.length} invalid price values`);
    }
  }

  /**
   * Prepare weights map from configuration and custom overrides
   */
  private prepareWeights(
    prices: NormalizedPrice[],
    customWeights?: Map<string, number>,
  ): Map<string, number> {
    const weights = new Map<string, number>();

    // Get unique sources
    const sources = new Set(prices.map(p => p.source));

    for (const source of sources) {
      // Priority: custom weights > config weights
      const weight = customWeights?.get(source) ?? getSourceWeight(source);
      weights.set(source, weight);
    }

    return weights;
  }

  /**
   * Calculate statistical metrics for the prices
   */
  private calculateMetrics(prices: NormalizedPrice[]): {
    standardDeviation: number;
    spread: number;
    variance: number;
  } {
    const priceValues = prices.map(p => p.price);
    const mean = priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length;

    // Calculate variance
    const squaredDiffs = priceValues.map(p => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / squaredDiffs.length;

    // Standard deviation
    const standardDeviation = Math.sqrt(variance);

    // Spread (percentage difference between min and max)
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const spread = ((maxPrice - minPrice) / mean) * 100;

    return {
      standardDeviation,
      spread,
      variance,
    };
  }

  /**
   * Calculate confidence score (0-100) based on metrics
   * 
   * Higher confidence when:
   * - Low spread (prices agree)
   * - Low standard deviation (consistent prices)
   * - More sources
   */
  private calculateConfidence(
    metrics: { standardDeviation: number; spread: number },
    sourceCount: number,
  ): number {
    // Base confidence from source count (max 40 points)
    // 3 sources = 20, 5 sources = 30, 10+ sources = 40
    const sourceScore = Math.min(40, 10 + sourceCount * 3);

    // Spread score (max 30 points)
    // 0% spread = 30, 5% spread = 15, 10%+ spread = 0
    const spreadScore = Math.max(0, 30 - metrics.spread * 3);

    // Standard deviation score (max 30 points)
    // Normalized by mean price, lower is better
    const stdDevScore = Math.max(0, 30 - metrics.standardDeviation * 0.3);

    const totalScore = sourceScore + spreadScore + stdDevScore;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, totalScore));
  }
}
