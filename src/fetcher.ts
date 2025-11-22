import axios, { AxiosInstance } from 'axios';
// @ts-ignore - Finnhub doesn't have proper TypeScript types
const finnhub = require('finnhub');

export interface PriceData {
  price: number;
  timestamp: number;
  assetId: string;
}

export interface DualPriceData {
  price1: PriceData;
  price2: PriceData;
}

export class PriceFetcher {
  private axiosInstance: AxiosInstance;
  private apiKey: string;
  private finnhubApiKey: string;
  private assetId: string;
  private maxRetries: number = 3;
  private retryDelay: number = 2000; // 2 seconds
  private finnhubClient: any;

  constructor(apiKey: string, assetId: string, finnhubApiKey: string) {
    this.apiKey = apiKey;
    this.finnhubApiKey = finnhubApiKey;
    this.assetId = assetId;
    this.axiosInstance = axios.create({
      timeout: 10000,
    });

    // Initialize Finnhub client with API key
    this.finnhubClient = new finnhub.DefaultApi(this.finnhubApiKey);
  }

  /**
   * Fetch price from AlphaVantage API
   */
  private async fetchFromAlphaVantage(): Promise<PriceData> {
    const url = `https://www.alphavantage.co/query`;
    const response = await this.axiosInstance.get(url, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: this.assetId,
        apikey: this.apiKey,
      },
    });

    const quote = response.data['Global Quote'];
    if (!quote || !quote['05. price']) {
      throw new Error(`Invalid response from AlphaVantage: ${JSON.stringify(response.data)}`);
    }

    const price = parseFloat(quote['05. price']);
    const timestamp = Math.floor(Date.now() / 1000); // Current Unix timestamp

    return {
      price: Math.round(price * 1e7), // Multiply by 1e7 to avoid floats
      timestamp,
      assetId: this.assetId,
    };
  }

  /**
   * Fetch price from Finnhub API (using SDK)
   */
  private async fetchFromFinnhub(): Promise<PriceData> {
    return new Promise((resolve, reject) => {
      this.finnhubClient.quote(this.assetId, (error: any, data: any, response: any) => {
        if (error) {
          reject(new Error(`Finnhub SDK error: ${error}`));
          return;
        }

        if (!data || !data.c || data.c === 0) {
          reject(new Error(`Invalid response from Finnhub SDK: ${JSON.stringify(data)}`));
          return;
        }

        const price = data.c; // Current price
        const timestamp = data.t || Math.floor(Date.now() / 1000);

        resolve({
          price: Math.round(price * 1e7), // Multiply by 1e7 to avoid floats
          timestamp,
          assetId: this.assetId,
        });
      });
    });
  }

  /**
   * Fetch price from Marketstack API
   */
  private async fetchFromMarketstack(): Promise<PriceData> {
    const url = `http://api.marketstack.com/v1/eod/latest`;
    const response = await this.axiosInstance.get(url, {
      params: {
        symbol: this.assetId,
        token: this.apiKey,
      },
    });

    if (!response.data || response.data.c === 0) {
      throw new Error(`Invalid response from Finnhub: ${JSON.stringify(response.data)}`);
    }

    const price = response.data.c; // Current price
    const timestamp = response.data.t || Math.floor(Date.now() / 1000); // Timestamp from API or current

    return {
      price: Math.round(price * 1e7), // Multiply by 1e7 to avoid floats
      timestamp,
      assetId: this.assetId,
    };
  }

  /**
   * Retry wrapper for API calls
   */
  private async retry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      console.warn(`Retry attempt ${this.maxRetries - retries + 1}/${this.maxRetries}`);
      await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      return this.retry(fn, retries - 1);
    }
  }

  /**
   * Fetch price data with retry logic
   * Tries AlphaVantage first, falls back to Finnhub if available
   */
  async fetchPrice(): Promise<PriceData> {
    try {
      // Try AlphaVantage first
      return await this.retry(() => this.fetchFromAlphaVantage());
    } catch (alphaVantageError) {
      console.warn('AlphaVantage failed, trying Finnhub...', alphaVantageError);
      try {
        // Fallback to Finnhub
        return await this.retry(() => this.fetchFromFinnhub());
      } catch (finnhubError) {
        throw new Error(
          `Both price APIs failed. AlphaVantage: ${alphaVantageError}, Finnhub: ${finnhubError}`
        );
      }
    }
  }

  /**
   * Fetch prices from both APIs in parallel for ZK proof generation
   * Returns both prices simultaneously for circuit verification
   */
  async fetchBothPrices(): Promise<DualPriceData> {
    try {
      const [price1Result, price2Result] = await Promise.allSettled([
        this.retry(() => this.fetchFromAlphaVantage()),
        this.retry(() => this.fetchFromFinnhub()),
      ]);

      // Extract successful results or throw errors
      if (price1Result.status === 'rejected') {
        throw new Error(`AlphaVantage failed: ${price1Result.reason}`);
      }
      if (price2Result.status === 'rejected') {
        throw new Error(`Finnhub failed: ${price2Result.reason}`);
      }

      return {
        price1: price1Result.value,
        price2: price2Result.value,
      };
    } catch (error) {
      throw new Error(`Failed to fetch both prices: ${error}`);
    }
  }
}


