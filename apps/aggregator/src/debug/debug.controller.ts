import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { DebugService } from './debug.service';

/**
 * Debug controller for development and troubleshooting.
 *
 * - GET /debug/prices - Returns last aggregated and normalized prices held in memory.
 */
@Controller('debug')
export class DebugController {
  constructor(private readonly debugService: DebugService) {}

  /**
   * Returns the last aggregated prices and last normalized prices per symbol.
   * Useful for verifying recent aggregation results without hitting external systems.
   */
  @Get('prices')
  @HttpCode(HttpStatus.OK)
  getLastPrices() {
    return this.debugService.getLastPrices();
  }
}
