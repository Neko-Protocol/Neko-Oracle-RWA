# Ingestor Service

Fetches real-time stock price data from external providers and normalizes it into a unified format.

## Overview

The Ingestor Service is responsible for:

- Connecting to external stock price APIs (currently Finnhub)
- Automatically fetching prices on a configurable interval via the **Scheduler Service**
- Normalizing responses into a consistent data structure
- Exposing price data via REST endpoints for on-demand queries

This service implements the **Adapter Pattern**, allowing new data providers to be added without modifying core logic.

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- Finnhub API Key ([register here](https://finnhub.io/register))

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

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000

# Finnhub API (Required)
FINNHUB_API_KEY=your_finnhub_api_key

# Scheduler Configuration
FETCH_INTERVAL_MS=60000
STOCK_SYMBOLS=AAPL,GOOGL,MSFT,TSLA
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | HTTP server port |
| `FINNHUB_API_KEY` | **Yes** | — | API key from Finnhub |
| `FETCH_INTERVAL_MS` | No | `60000` | Polling interval in milliseconds |
| `STOCK_SYMBOLS` | No | — | Comma-separated list of symbols to fetch |

### Running the Service

#### Development Mode

```bash
npm run start:dev
```

The service will start on `http://localhost:3000` (or the port specified in `.env`).

#### Production Mode

First, build the application:

```bash
npm run build
```

Then start the service:

```bash
npm start
```

### Linting

Check code style:

```bash
npm run lint
```

## API Endpoints

### Get Stock Price

```bash
GET /prices/:symbol
```

Fetches the current price for a given stock symbol.

**Example Request:**

```bash
curl http://localhost:3000/prices/AAPL
```

**Example Response:**

```json
{
  "source": "Finnhub",
  "symbol": "AAPL",
  "price": 150.20,
  "timestamp": 1706540400000
}
```

**Response Fields:**

| Field       | Type     | Description                            |
|-------------|----------|----------------------------------------|
| `source`    | `string` | Data provider identifier               |
| `symbol`    | `string` | Stock ticker symbol (uppercase)        |
| `price`     | `number` | Current price in USD                   |
| `timestamp` | `number` | Unix timestamp in milliseconds         |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Ingestor Service                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Scheduler ──(interval)──► PriceFetcherService             │
│                                     │                       │
│                                     ▼                       │
│   HTTP Request ──► Controller ──► FinnhubAdapter ──► API    │
│                                     │                       │
│                                     ▼                       │
│                            NormalizedStockPrice             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Flows:**
- **Scheduled:** The `SchedulerService` triggers `PriceFetcherService` at a configurable interval to fetch all configured symbols automatically.
- **On-Demand:** REST endpoints allow fetching a specific symbol's price via HTTP.

Each provider adapter implements a common `PriceProvider` interface, enabling seamless addition of new data sources.

## Project Structure

```
apps/ingestor/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   ├── controllers/         # HTTP request handlers
│   ├── services/            # Business logic
│   ├── providers/           # External API adapters
│   └── modules/             # Feature modules
├── .env.example             # Example environment variables
├── nest-cli.json            # NestJS CLI configuration
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## Limitations

This is a **Proof of Concept** implementation with the following constraints:

- Single provider only (Finnhub)
- No retry logic on API failures
- No caching mechanism
- No persistent storage (pass-through only)
- No rate limiting protection
- No test coverage yet
- Basic error handling only

## Status

🚧 POC complete — Integration with Aggregator service planned for next phase.
