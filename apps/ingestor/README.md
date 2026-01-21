# Ingestor Service

Connects to external stock price APIs and fetches raw price data.

## Overview

The ingestor service is responsible for:
- Connecting to external stock price APIs (e.g., Alpha Vantage, Yahoo Finance, etc.)
- Fetching raw price data for specified stock symbols
- Normalizing initial data format
- Publishing raw data to the next stage (aggregator)

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

Edit `.env` with your API keys and configuration.

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
apps/ingestor/
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
