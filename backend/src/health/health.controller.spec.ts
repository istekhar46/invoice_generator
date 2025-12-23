import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  const mockHealthService = {
    getHealthStatus: jest.fn(),
    getSimpleHealthStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status when system is healthy', async () => {
      // Arrange
      const healthyResponse = {
        status: 'healthy' as const,
        timestamp: '2023-01-01T00:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
        environment: 'test',
        services: {
          database: { status: 'healthy' as const, responseTime: 10 },
          memory: { used: 100, total: 1000, percentage: 10 },
          system: { platform: 'linux', nodeVersion: 'v18.0.0', pid: 1234 },
        },
      };
      mockHealthService.getHealthStatus.mockResolvedValue(healthyResponse);

      // Act
      const result = await controller.getHealth();

      // Assert
      expect(result).toEqual(healthyResponse);
      expect(mockHealthService.getHealthStatus).toHaveBeenCalled();
    });

    it('should throw 503 error when system is unhealthy', async () => {
      // Arrange
      const unhealthyResponse = {
        status: 'unhealthy' as const,
        timestamp: '2023-01-01T00:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
        environment: 'test',
        services: {
          database: { status: 'unhealthy' as const, error: 'Connection failed' },
          memory: { used: 100, total: 1000, percentage: 10 },
          system: { platform: 'linux', nodeVersion: 'v18.0.0', pid: 1234 },
        },
      };
      mockHealthService.getHealthStatus.mockResolvedValue(unhealthyResponse);

      // Act & Assert
      await expect(controller.getHealth()).rejects.toThrow(HttpException);
      expect(mockHealthService.getHealthStatus).toHaveBeenCalled();
    });

    it('should throw 503 error when health service throws error', async () => {
      // Arrange
      mockHealthService.getHealthStatus.mockRejectedValue(new Error('Service error'));

      // Act & Assert
      await expect(controller.getHealth()).rejects.toThrow(HttpException);
      expect(mockHealthService.getHealthStatus).toHaveBeenCalled();
    });
  });

  describe('getReadiness', () => {
    it('should return OK status when service is ready', async () => {
      // Arrange
      const readyResponse = {
        status: 'OK',
        timestamp: '2023-01-01T00:00:00.000Z',
      };
      mockHealthService.getSimpleHealthStatus.mockResolvedValue(readyResponse);

      // Act
      const result = await controller.getReadiness();

      // Assert
      expect(result).toEqual(readyResponse);
      expect(mockHealthService.getSimpleHealthStatus).toHaveBeenCalled();
    });

    it('should throw 503 error when service is not ready', async () => {
      // Arrange
      mockHealthService.getSimpleHealthStatus.mockRejectedValue(new Error('Not ready'));

      // Act & Assert
      await expect(controller.getReadiness()).rejects.toThrow(HttpException);
      expect(mockHealthService.getSimpleHealthStatus).toHaveBeenCalled();
    });
  });

  describe('getLiveness', () => {
    it('should return alive status', async () => {
      // Act
      const result = await controller.getLiveness();

      // Assert
      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe('number');
    });
  });
});