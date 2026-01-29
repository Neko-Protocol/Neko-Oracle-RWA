// Main entry point for the Shared package
export interface NormalizedStockPrice {
    source : string;
    symbol: string; 
    price: number ;
    timestamp: number; 
}
// Shared utilities and types will be exported here

// Type exports
export * from './types';
