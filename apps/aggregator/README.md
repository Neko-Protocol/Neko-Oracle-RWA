# Aggregator Service

Normalizes, filters, and aggregates stock price data from multiple sources.

## Overview

The aggregator service is responsible for:
- Receiving raw price data from multiple ingestors
- Normalizing data formats from different sources
- Filtering out outliers and invalid data
- Aggregating prices using weighted averages or median calculations
- Producing a single consensus price per stock symbol

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

### Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with coverage:

```bash
npm run test:cov
```

### Linting

Check code style:

```bash
npm run lint
```

## Project Structure

```
apps/aggregator/
├── src/
│   ├── main.ts          # Application entry point
│   └── app.module.ts    # Root module
├── .env.example         # Example environment variables
├── nest-cli.json        # NestJS CLI configuration
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Status

🚧 Under construction - Business logic will be implemented in subsequent issues.
