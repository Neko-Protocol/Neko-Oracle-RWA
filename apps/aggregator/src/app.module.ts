import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DataReceptionService } from './services/data-reception.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [],
  providers: [DataReceptionService],
})
export class AppModule { }
