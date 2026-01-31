import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AggregationService } from './services/aggregation.service';
import { WeightedAverageAggregator } from './strategies/aggregators/weighted-average.aggregator';
import { MedianAggregator } from './strategies/aggregators/median.aggregator';
import { TrimmedMeanAggregator } from './strategies/aggregators/trimmed-mean.aggregator';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { DebugModule } from './debug/debug.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    HealthModule,
    MetricsModule,
    DebugModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [],
  providers: [
    DataReceptionService,
    AggregationService,
    WeightedAverageAggregator,
    MedianAggregator,
    TrimmedMeanAggregator,
  ],
  exports: [AggregationService],
})
export class AppModule { }
