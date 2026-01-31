import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { HealthCheckError } from '@nestjs/terminus';
import { IngestorHealthIndicator } from './ingestor.health';

describe('IngestorHealthIndicator', () => {
  let indicator: IngestorHealthIndicator;
  let configService: ConfigService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestorHealthIndicator,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: HttpService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    indicator = module.get<IngestorHealthIndicator>(IngestorHealthIndicator);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  it('should return up with "not configured" when INGESTOR_URL is not set', async () => {
    jest.mocked(configService.get).mockReturnValue(undefined);
    const result = await indicator.isHealthy('ingestor');
    expect(result).toEqual({
      ingestor: { status: 'up', message: 'Ingestor not configured (skipped)' },
    });
  });

  it('should return up when ingestor responds with 200', async () => {
    jest.mocked(configService.get).mockReturnValue('http://localhost:3000');
    jest.mocked(httpService.get).mockReturnValue(
      of({
        status: 200,
        data: [],
        statusText: 'OK',
        headers: {},
        config: {} as never,
      }),
    );
    const result = await indicator.isHealthy('ingestor');
    expect(result).toEqual({
      ingestor: { status: 'up', message: 'Ingestor is reachable' },
    });
    expect(httpService.get).toHaveBeenCalledWith(
      'http://localhost:3000/prices/raw',
      expect.objectContaining({ timeout: 5000, validateStatus: expect.any(Function) }),
    );
  });

  it('should throw HealthCheckError when ingestor returns 5xx', async () => {
    jest.mocked(configService.get).mockReturnValue('http://localhost:3000');
    jest.mocked(httpService.get).mockReturnValue(
      of({
        status: 503,
        data: null,
        statusText: 'Service Unavailable',
        headers: {},
        config: {} as never,
      }),
    );
    await expect(indicator.isHealthy('ingestor')).rejects.toThrow(HealthCheckError);
  });

  it('should throw HealthCheckError when HTTP request fails', async () => {
    jest.mocked(configService.get).mockReturnValue('http://localhost:3000');
    jest.mocked(httpService.get).mockReturnValue(
      throwError(() => new Error('ECONNREFUSED')),
    );
    await expect(indicator.isHealthy('ingestor')).rejects.toThrow(HealthCheckError);
  });
});
