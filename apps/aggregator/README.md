# Aggregator Service

Price aggregation and consensus calculation service for the Oracle RWA system.

## Overview

The Aggregator service is responsible for calculating a single consensus price per symbol from multiple normalized and filtered data sources. It supports multiple aggregation strategies and provides confidence metrics to ensure data reliability.

## Features

- **Multiple Aggregation Methods**
  - Weighted Average
  - Median
  - Trimmed Mean

- **Confidence Metrics**
  - Standard deviation
  - Price spread (min/max difference)
  - Variance
  - Source count
  - Confidence score (0-100)

- **Configurable Settings**
  - Minimum source requirements
  - Time window filtering
  - Per-source weight configuration
  - Custom aggregation parameters

## API Endpoints (Health, Metrics & Debug)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Full health check. Returns **200** if all configured dependencies (Redis, Ingestor) are healthy, **503** otherwise. Used for overall service health. |
| `/ready` | GET | Readiness probe for Kubernetes. Same checks as `/health`; returns 200 when the service can accept traffic. |
| `/live` | GET | Liveness probe for Kubernetes. Returns 200 when the process is alive (no dependency checks). |
| `/status` | GET | Detailed system information: uptime, memory usage, dependency check results, and version. |
| `/metrics` | GET | Prometheus metrics in [exposition format](https://prometheus.io/docs/instrumenting/exposition_formats/). Scrape this endpoint for aggregation count, latency, errors, and default Node.js metrics. |
| `/debug/prices` | GET | Last aggregated and normalized prices held in memory. Useful for debugging without hitting external systems. |

**Health checks**: When `REDIS_URL` or `INGESTOR_URL` are set, the health check verifies connectivity. If a configured dependency is unreachable, `/health` and `/ready` return 503. If not set, that dependency is skipped (not included in the check).

## Architecture

```
aggregator/
├── src/
│   ├── interfaces/           # TypeScript interfaces
│   │   ├── normalized-price.interface.ts
│   │   ├── aggregated-price.interface.ts
│   │   ├── aggregator.interface.ts
│   │   └── aggregation-config.interface.ts
│   ├── strategies/
│   │   └── aggregators/      # Aggregation strategy implementations
│   │       ├── weighted-average.aggregator.ts
│   │       ├── median.aggregator.ts
│   │       └── trimmed-mean.aggregator.ts
│   ├── services/
│   │   └── aggregation.service.ts   # Main aggregation service
│   ├── health/               # Health checks (Terminus)
│   │   ├── health.controller.ts
│   │   └── indicators/
│   │       ├── redis.health.ts
│   │       └── ingestor.health.ts
│   ├── metrics/              # Prometheus metrics
│   │   ├── metrics.controller.ts
│   │   └── metrics.service.ts
│   ├── debug/                # Debug endpoints
│   │   ├── debug.controller.ts
│   │   └── debug.service.ts
│   ├── config/
│   │   └── source-weights.config.ts  # Weight configuration
│   └── app.module.ts
```

## Aggregation Methods

### Weighted Average

**Formula**: `Σ(price_i × weight_i) / Σ(weight_i)`

**Use Cases**:
- When you trust certain sources more than others
- Stable markets with reliable data providers
- Want smooth, continuous price updates

**Pros**:
- Rewards trusted sources
- Produces smooth consensus prices
- Good for stable markets

**Cons**:
- Susceptible to manipulation if high-weight source is compromised
- Not resistant to outliers

**When to Use**: Default choice for most scenarios with trusted data providers.

---

### Median

**Formula**: Middle value (or average of two middle values) after sorting

**Use Cases**:
- Volatile markets
- When source reliability varies significantly
- Protection against manipulation attempts
- Suspicious of potential outliers

**Pros**:
- Highly resistant to outliers
- Not affected by a single manipulated source
- Simple and robust

**Cons**:
- Ignores majority of data points
- Doesn't account for source reliability
- Can be manipulated if >50% of sources are compromised

**When to Use**: When outlier resistance is more important than using all available data.

---

### Trimmed Mean

**Formula**: Average after removing top X% and bottom X% of values

**Use Cases**:
- Balanced approach between mean and median
- Markets with occasional outliers but mostly reliable data
- Want to use more data than median

**Pros**:
- Resistant to outliers
- Uses more data than median
- Good balance between robustness and sensitivity
- Can be weighted after trimming

**Cons**:
- Requires sufficient data points
- Trim percentage needs tuning
- May discard valid extreme prices in volatile markets

**When to Use**: When you want outlier resistance but want to use more data than the median method.

---

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Service Configuration
PORT=3001

# Aggregation Settings
MIN_SOURCES=3                        # Minimum sources required
TIME_WINDOW_MS=30000                 # 30 seconds
DEFAULT_AGGREGATION_METHOD=weighted-average
TRIMMED_MEAN_PERCENTAGE=0.2          # 20% trim from each end

# Source Weights (higher = more trusted)
WEIGHT_BLOOMBERG=2.0
WEIGHT_REUTERS=2.0
WEIGHT_ALPHAVANTAGE=1.5
WEIGHT_YAHOOFINANCE=1.2
WEIGHT_FINNHUB=1.2
WEIGHT_DEFAULT=1.0
```

### Source Weights

Edit [src/config/source-weights.config.ts](src/config/source-weights.config.ts) to customize source reliability weights:

```typescript
export const SOURCE_WEIGHTS: Record<string, number> = {
  'Bloomberg': 2.0,      // Premium, highly reliable
  'Reuters': 2.0,
  'AlphaVantage': 1.5,   // High reliability
  'YahooFinance': 1.2,   // Standard reliability
  'Finnhub': 1.2,
  'default': 1.0,        // Fallback for unknown sources
};
```

**Weight Guidelines**:
- `2.0`: Premium sources (Bloomberg, Reuters)
- `1.2-1.5`: High reliability (major APIs)
- `1.0`: Standard reliability
- `0.5-0.8`: Lower reliability (free tier, rate-limited)
- `0.0`: Disabled (ignored in calculations)

## Usage

### Basic Usage

```typescript
import { AggregationService } from './services/aggregation.service';
import { NormalizedPrice } from './interfaces/normalized-price.interface';

// Create service instance
const aggregationService = new AggregationService();

// Prepare normalized prices
const prices: NormalizedPrice[] = [
  { symbol: 'AAPL', price: 150.25, timestamp: Date.now(), source: 'AlphaVantage' },
  { symbol: 'AAPL', price: 150.30, timestamp: Date.now(), source: 'YahooFinance' },
  { symbol: 'AAPL', price: 150.20, timestamp: Date.now(), source: 'Finnhub' },
];

// Aggregate with default settings
const result = aggregationService.aggregate('AAPL', prices);

console.log(`Consensus Price: $${result.price.toFixed(2)}`);
console.log(`Confidence: ${result.confidence.toFixed(1)}%`);
console.log(`Sources: ${result.sources.join(', ')}`);
```

### Custom Options

```typescript
// Use median method with custom settings
const result = aggregationService.aggregate('AAPL', prices, {
  method: 'median',
  minSources: 5,
  timeWindowMs: 60000,  // 1 minute
});

// Use trimmed mean with custom trim percentage
const result = aggregationService.aggregate('GOOGL', prices, {
  method: 'trimmed-mean',
  trimPercentage: 0.25,  // Remove 25% from each end
});

// Use custom weights
const customWeights = new Map([
  ['Bloomberg', 3.0],
  ['AlphaVantage', 1.0],
]);

const result = aggregationService.aggregate('MSFT', prices, {
  method: 'weighted-average',
  customWeights,
});
```

### Aggregate Multiple Symbols

```typescript
const pricesBySymbol = new Map([
  ['AAPL', [/* prices for AAPL */]],
  ['GOOGL', [/* prices for GOOGL */]],
  ['MSFT', [/* prices for MSFT */]],
]);

const results = aggregationService.aggregateMultiple(pricesBySymbol, {
  method: 'weighted-average',
  minSources: 3,
});

for (const [symbol, result] of results) {
  console.log(`${symbol}: $${result.price.toFixed(2)}`);
}
```

## Output Format

The `AggregatedPrice` interface provides comprehensive information:

```typescript
{
  symbol: "AAPL",
  price: 150.25,
  method: "weighted-average",
  confidence: 92.5,
  metrics: {
    standardDeviation: 0.05,
    spread: 0.066,        // Percentage spread
    sourceCount: 3,
    variance: 0.0025
  },
  startTimestamp: 1706400000000,
  endTimestamp: 1706400030000,
  sources: ["AlphaVantage", "YahooFinance", "Finnhub"],
  computedAt: 1706400031000
}
```

## Confidence Scoring

Confidence score (0-100) is calculated based on:

1. **Source Count** (max 40 points)
   - More sources = higher confidence
   - 3 sources ≈ 20 points
   - 10+ sources ≈ 40 points

2. **Price Spread** (max 30 points)
   - Lower spread = higher confidence
   - 0% spread = 30 points
   - 10%+ spread = 0 points

3. **Standard Deviation** (max 30 points)
   - Lower deviation = higher confidence
   - Normalized by price scale

**Example**:
- 5 sources, 1% spread, low deviation → ~90% confidence
- 3 sources, 10% spread, high deviation → ~30% confidence

## Features

### Data Reception Layer
Implemented via `DataReceptionService`, this layer connects to Ingestor services to receive real-time and historical data.
- **WebSocket Client**: Real-time price streaming with exponential backoff reconnection.
- **HTTP Fallback**: Retrieval of historical data and latest price snapshots.
- **Event-Driven**: Emits `price.received` events using `EventEmitter2`.
- **Validation**: Schema-based validation using `class-validator`.

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

Install dependencies:

```bash
npm install
```

### Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration.

### Running the Service

#### Development Mode

```bash
npm run start:dev
```

The service will start on `http://localhost:3001` (or the port specified in `.env`).

#### Production Mode

First, build the application:

```bash
npm run build
```

Then start the service:

```bash
npm start
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov
```

### Test Coverage

All components have comprehensive test coverage (>85%):

- ✅ `aggregation.service.spec.ts` - 50+ test cases
- ✅ `weighted-average.aggregator.spec.ts` - 15+ test cases
- ✅ `median.aggregator.spec.ts` - 18+ test cases
- ✅ `trimmed-mean.aggregator.spec.ts` - 20+ test cases

## Error Handling

The service throws errors for invalid inputs:

```typescript
try {
  const result = aggregationService.aggregate('AAPL', prices);
} catch (error) {
  // Possible errors:
  // - "Symbol cannot be empty"
  // - "Prices array cannot be empty"
  // - "Insufficient sources for AAPL. Required: 3, Found: 2"
  // - "Insufficient recent sources for AAPL..."
  // - "All prices must be for symbol AAPL"
  // - "Found N invalid price values"
  // - "Unknown aggregation method: xyz"
}
```

## Development

### Adding a New Aggregation Method

1. Create a new aggregator class implementing `IAggregator`:

```typescript
@Injectable()
export class MyCustomAggregator implements IAggregator {
  readonly name = 'my-custom';

  aggregate(prices: NormalizedPrice[], weights?: Map<string, number>): number {
    // Your implementation
  }
}
```

2. Register in `AggregationService` constructor:

```typescript
this.aggregators.set('my-custom', new MyCustomAggregator());
```

3. Add comprehensive tests

4. Update documentation

## Performance Considerations

- **Time Windows**: Shorter windows (10-30s) for real-time, longer (1-5min) for stability
- **Source Count**: More sources increase confidence but also processing time
- **Aggregation Method**:
  - Weighted Average: O(n)
  - Median: O(n log n) due to sorting
  - Trimmed Mean: O(n log n) due to sorting

## Integration

This service is designed to work with:

- **Upstream**: Ingestor service (provides normalized prices)
- **Downstream**: Transactor service (consumes aggregated prices)
- **Storage**: Can be integrated with databases for historical data

## Roadmap

- [ ] Add VWAP (Volume Weighted Average Price) aggregator
- [ ] Implement outlier detection algorithms
- [ ] Add historical aggregation analysis
- [ ] Support custom aggregation strategies via plugins
- [ ] Add real-time streaming aggregation
- [ ] Implement adaptive weight adjustment based on accuracy

## Contributing

1. Follow the existing code structure
2. Add comprehensive tests (>85% coverage)
3. Update documentation
4. Follow TypeScript best practices
5. Use descriptive commit messages

## License

MIT
