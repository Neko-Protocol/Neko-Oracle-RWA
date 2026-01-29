import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataReceptionService } from './data-reception.service';
import { of, throwError } from 'rxjs';
import { WebSocket } from 'ws';

jest.mock('ws');

describe('DataReceptionService', () => {
    let service: DataReceptionService;
    let httpService: HttpService;
    let eventEmitter: EventEmitter2;

    const mockConfigService = {
        get: jest.fn((key: string): any => {
            if (key === 'INGESTOR_WS_URL') return 'ws://localhost:3000';
            if (key === 'INGESTOR_HTTP_URL') return 'http://localhost:3000';
            return null;
        }),
    };

    const mockHttpService = {
        get: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataReceptionService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: HttpService, useValue: mockHttpService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
            ],
        }).compile();

        service = module.get<DataReceptionService>(DataReceptionService);
        httpService = module.get<HttpService>(HttpService);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    afterEach(() => {
        jest.clearAllMocks();
        service.onModuleDestroy();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('WebSocket Connection', () => {
        it('should initialize WebSocket connection on init', () => {
            service.onModuleInit();
            expect(WebSocket).toHaveBeenCalledWith('ws://localhost:3000');
        });

        it('should log error if INGESTOR_WS_URL is missing', () => {
            mockConfigService.get.mockReturnValueOnce(null);
            const loggerSpy = jest.spyOn((service as any).logger, 'error');
            service.onModuleInit();
            expect(loggerSpy).toHaveBeenCalledWith('INGESTOR_WS_URL is not defined in the configuration');
        });
    });

    describe('fetchHistoricalData', () => {
        it('should fetch historical data successfully', async () => {
            const mockData = [{ symbol: 'BTC', price: 50000, source: 'base', timestamp: '2026-01-27T13:00:00Z' }];
            mockHttpService.get.mockReturnValue(of({ data: mockData }));

            const result = await service.fetchHistoricalData('BTC');
            expect(result[0].symbol).toBe('BTC');
            expect(httpService.get).toHaveBeenCalledWith('http://localhost:3000/prices/historical/BTC');
        });

        it('should return empty array if response is not an array', async () => {
            mockHttpService.get.mockReturnValue(of({ data: null }));
            const result = await service.fetchHistoricalData('BTC');
            expect(result).toEqual([]);
        });

        it('should throw error if INGESTOR_HTTP_URL is missing', async () => {
            mockConfigService.get.mockImplementation((key) => key === 'INGESTOR_HTTP_URL' ? null : 'value');
            await expect(service.fetchHistoricalData('BTC')).rejects.toThrow('INGESTOR_HTTP_URL is not defined');
        });

        it('should throw error if fetch fails', async () => {
            mockConfigService.get.mockReturnValue('http://localhost:3000');
            mockHttpService.get.mockReturnValue(throwError(() => new Error('HTTP Error')));
            await expect(service.fetchHistoricalData('BTC')).rejects.toThrow('HTTP Error');
        });
    });

    describe('getLatestSnapshot', () => {
        it('should fetch latest snapshot successfully', async () => {
            const mockData = { symbol: 'BTC', price: 50000, source: 'base', timestamp: '2026-01-27T13:00:00Z' };
            mockHttpService.get.mockReturnValue(of({ data: mockData }));

            const result = await service.getLatestSnapshot('BTC');
            expect(result.symbol).toBe('BTC');
            expect(httpService.get).toHaveBeenCalledWith('http://localhost:3000/prices/latest/BTC');
        });

        it('should throw error if snapshot fetch fails', async () => {
            mockHttpService.get.mockReturnValue(throwError(() => new Error('Snapshot Error')));
            await expect(service.getLatestSnapshot('BTC')).rejects.toThrow('Snapshot Error');
        });
    });

    describe('WebSocket reconnection', () => {
        let wsInstance: any;

        beforeEach(() => {
            jest.useFakeTimers();
            service.onModuleInit();
            wsInstance = (WebSocket as any).mock.instances[0];
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should attempt reconnection on close', () => {
            const connectSpy = jest.spyOn(service as any, 'connectWebSocket');

            // Get the close handler
            const closeHandler = wsInstance.on.mock.calls.find((call: any) => call[0] === 'close')[1];
            closeHandler();

            expect((service as any).reconnectAttempts).toBe(1);

            // Fast-forward time for backoff
            jest.advanceTimersByTime(2000);

            expect(connectSpy).toHaveBeenCalledTimes(1);
        });

        it('should stop reconnecting after max attempts', () => {
            (service as any).reconnectAttempts = 5;
            const loggerSpy = jest.spyOn((service as any).logger, 'error');

            (service as any).handleReconnection();

            expect(loggerSpy).toHaveBeenCalledWith('Max reconnection attempts reached or service stopping.');
        });
    });

    describe('process incoming messages', () => {
        let wsInstance: any;

        beforeEach(() => {
            service.onModuleInit();
            wsInstance = (WebSocket as any).mock.instances[0];
        });

        it('should validate and emit event for valid price data', async () => {
            const validPayload = {
                symbol: 'ETH',
                price: 2500,
                source: 'binance',
                timestamp: '2026-01-27T13:00:00Z',
            };

            const messageHandler = wsInstance.on.mock.calls.find((call: any) => call[0] === 'message')[1];
            await messageHandler(JSON.stringify(validPayload));

            expect(eventEmitter.emit).toHaveBeenCalledWith('price.received', expect.any(Object));
        });

        it('should log error for invalid JSON', async () => {
            const loggerSpy = jest.spyOn((service as any).logger, 'error');
            const messageHandler = wsInstance.on.mock.calls.find((call: any) => call[0] === 'message')[1];

            await messageHandler('invalid-json');

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Error processing message'));
        });

        it('should log error for invalid price data', async () => {
            const invalidPayload = {
                symbol: 'ETH',
                price: -100,
            };

            const loggerSpy = jest.spyOn((service as any).logger, 'error');
            const messageHandler = wsInstance.on.mock.calls.find((call: any) => call[0] === 'message')[1];
            await messageHandler(JSON.stringify(invalidPayload));

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Validation failed'));
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });
    });
});
