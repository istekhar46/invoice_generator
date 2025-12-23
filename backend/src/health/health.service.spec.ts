import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { PrismaService } from '../database/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    healthCheck: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when database is healthy', async () => {
      // Arrange
      mockPrismaService.healthCheck.mockResolvedValue({
        status: 'healthy',
        timestamp: '2023-01-01T00:00:00.000Z',
      });
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        switch (key) {
          case 'npm_package_version':
            return '1.0.0';
          case 'NODE_ENV':
            return 'test';
          default:
            return defaultValue;
        }
      });

      // Act
      const result = await service.getHealthStatus();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.services.database.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
      expect(result.environment).toBe('test');
      expect(result.services.memory).toBeDefined();
      expect(result.services.system).toBeDefined();
      expect(mockPrismaService.healthCheck).toHaveBeenCalled();
    });

    it('should return unhealthy status when database is unhealthy', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockPrismaService.healthCheck.mockRejectedValue(dbError);
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        switch (key) {
          case 'npm_package_version':
            return '1.0.0';
          case 'NODE_ENV':
            return 'test';
          default:
            return defaultValue;
        }
      });

      // Act
      const result = await service.getHealthStatus();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('unhealthy');
      expect(result.services.database.error).toBe('Database connection failed');
      expect(mockPrismaService.healthCheck).toHaveBeenCalled();
    });
  });

  describe('getSimpleHealthStatus', () => {
    it('should return OK status when database is healthy', async () => {
      // Arrange
      mockPrismaService.healthCheck.mockResolvedValue({
        status: 'healthy',
        timestamp: '2023-01-01T00:00:00.000Z',
      });

      // Act
      const result = await service.getSimpleHealthStatus();

      // Assert
      expect(result.status).toBe('OK');
      expect(result.timestamp).toBeDefined();
      expect(mockPrismaService.healthCheck).toHaveBeenCalled();
    });

    it('should throw error when database is unhealthy', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockPrismaService.healthCheck.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.getSimpleHealthStatus()).rejects.toThrow();
      expect(mockPrismaService.healthCheck).toHaveBeenCalled();
    });
  });
});