import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    system: {
      platform: string;
      nodeVersion: string;
      pid: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getHealthStatus(): Promise<HealthCheckResponse> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Check database health
    const databaseHealth = await this.checkDatabaseHealth();

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;

    // Determine overall health status
    const isHealthy = databaseHealth.status === 'healthy';

    const healthResponse: HealthCheckResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      uptime,
      version: this.configService.get('npm_package_version', '1.0.0'),
      environment: this.configService.get('NODE_ENV', 'development'),
      services: {
        database: databaseHealth,
        memory: {
          used: Math.round(usedMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          percentage: Math.round((usedMemory / totalMemory) * 100),
        },
        system: {
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid,
        },
      },
    };

    this.logger.log(`Health check completed: ${healthResponse.status}`);
    return healthResponse;
  }

  private async checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.prismaService.healthCheck();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Database health check failed:', error);
      
      return {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  async getSimpleHealthStatus(): Promise<{ status: string; timestamp: string }> {
    try {
      await this.prismaService.healthCheck();
      return {
        status: 'OK',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Simple health check failed:', error);
      throw error;
    }
  }
}