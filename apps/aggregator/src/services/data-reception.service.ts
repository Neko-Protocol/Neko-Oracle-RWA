import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { WebSocket } from 'ws';
import { firstValueFrom } from 'rxjs';
import { PriceInputDto } from '../dto/price-input.dto';

@Injectable()
export class DataReceptionService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DataReceptionService.name);
    private ws: WebSocket;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 5;
    private isDestroyed = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    onModuleInit() {
        this.connectWebSocket();
    }

    onModuleDestroy() {
        this.isDestroyed = true;
        if (this.ws) {
            this.ws.close();
        }
    }

    private connectWebSocket() {
        const wsUrl = this.configService.get<string>('INGESTOR_WS_URL');
        if (!wsUrl) {
            this.logger.error('INGESTOR_WS_URL is not defined in the configuration');
            return;
        }

        this.logger.log(`Connecting to Ingestor WebSocket: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
            this.logger.log('Connected to Ingestor WebSocket');
            this.reconnectAttempts = 0;
        });

        this.ws.on('message', async (data: string) => {
            try {
                const payload = JSON.parse(data.toString());
                await this.handleIncomingPrice(payload);
            } catch (error) {
                this.logger.error(`Error processing message: ${error.message}`);
            }
        });

        this.ws.on('error', (error) => {
            this.logger.error(`WebSocket error: ${error.message}`);
        });

        this.ws.on('close', () => {
            this.logger.warn('Disconnected from Ingestor WebSocket');
            this.handleReconnection();
        });
    }

    private handleReconnection() {
        if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.error('Max reconnection attempts reached or service stopping.');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.pow(2, this.reconnectAttempts) * 1000;
        this.logger.log(`Reconnecting in ${delay / 1000} seconds... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            if (!this.isDestroyed) {
                this.connectWebSocket();
            }
        }, delay);
    }

    private async handleIncomingPrice(payload: any) {
        const priceDto = plainToInstance(PriceInputDto, payload);
        const errors = await validate(priceDto);

        if (errors.length > 0) {
            this.logger.error(`Validation failed for incoming price: ${JSON.stringify(errors)}`);
            return;
        }

        this.logger.debug(`Received valid price: ${priceDto.symbol} - ${priceDto.price}`);
        this.eventEmitter.emit('price.received', priceDto);
    }

    async fetchHistoricalData(symbol: string): Promise<PriceInputDto[]> {
        const baseUrl = this.configService.get<string>('INGESTOR_HTTP_URL');
        if (!baseUrl) {
            throw new Error('INGESTOR_HTTP_URL is not defined');
        }

        try {
            this.logger.log(`Fetching historical data for ${symbol} via HTTP`);
            const response = await firstValueFrom(
                this.httpService.get(`${baseUrl}/prices/historical/${symbol}`),
            );

            const data = response.data;
            if (Array.isArray(data)) {
                return data.map(item => plainToInstance(PriceInputDto, item));
            }
            return [];
        } catch (error) {
            this.logger.error(`Failed to fetch historical data: ${error.message}`);
            throw error;
        }
    }

    async getLatestSnapshot(symbol: string): Promise<PriceInputDto> {
        const baseUrl = this.configService.get<string>('INGESTOR_HTTP_URL');
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${baseUrl}/prices/latest/${symbol}`),
            );
            return plainToInstance(PriceInputDto, response.data);
        } catch (error) {
            this.logger.error(`Failed to fetch latest snapshot: ${error.message}`);
            throw error;
        }
    }
}
