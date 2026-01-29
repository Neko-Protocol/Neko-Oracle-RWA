import { RawPrice } from '@oracle-stocks/shared';

/**
 * Base exception for normalization errors
 */
export class NormalizationException extends Error {
  constructor(
    message: string,
    public readonly rawPrice?: RawPrice,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'NormalizationException';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Exception for validation failures
 */
export class ValidationException extends NormalizationException {
  constructor(message: string, rawPrice?: RawPrice) {
    super(message, rawPrice);
    this.name = 'ValidationException';
  }
}

/**
 * Exception when no normalizer is found for a source
 */
export class NoNormalizerFoundException extends NormalizationException {
  constructor(source: string, rawPrice?: RawPrice) {
    super(`No normalizer found for source: ${source}`, rawPrice);
    this.name = 'NoNormalizerFoundException';
  }
}
