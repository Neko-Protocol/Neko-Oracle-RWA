import { Module } from '@nestjs/common';
import { NormalizationModule } from './modules/normalization.module';
import { AggregationService } from './services/aggregation.service';
import { WeightedAverageAggregator } from './strategies/aggregators/weighted-average.aggregator';
import { MedianAggregator } from './strategies/aggregators/median.aggregator';
import { TrimmedMeanAggregator } from './strategies/aggregators/trimmed-mean.aggregator';

@Module({
  imports: [NormalizationModule],
  controllers: [],
  providers: [
    AggregationService,
    WeightedAverageAggregator,
    MedianAggregator,
    TrimmedMeanAggregator,
  ],
  exports: [AggregationService],
})
export class AppModule {}
