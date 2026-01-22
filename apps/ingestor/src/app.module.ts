import { Module } from '@nestjs/common';
import { PricesModule } from './modules/prices.module';

@Module({
  imports: [PricesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
