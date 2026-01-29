import { Module } from '@nestjs/common';
import { NormalizationService } from '../services/normalization.service';

@Module({
  providers: [NormalizationService],
  exports: [NormalizationService],
})
export class NormalizationModule {}
