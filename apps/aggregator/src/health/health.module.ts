import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { IngestorHealthIndicator } from './indicators/ingestor.health';

@Module({
  imports: [
    ConfigModule,
    TerminusModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 0,
    }),
  ],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, IngestorHealthIndicator],
  exports: [RedisHealthIndicator, IngestorHealthIndicator],
})
export class HealthModule {}
