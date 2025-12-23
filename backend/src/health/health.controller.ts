import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService, HealthCheckResponse } from './health.service';

@ApiTags('Health')
@Controller('health')
@Public() // Health endpoints should be publicly accessible
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get comprehensive health status',
    description: 'Returns detailed health information including database connectivity, memory usage, and system information'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'System is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', description: 'Uptime in seconds' },
        version: { type: 'string' },
        environment: { type: 'string' },
        services: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                responseTime: { type: 'number', description: 'Response time in milliseconds' },
                error: { type: 'string', description: 'Error message if unhealthy' }
              }
            },
            memory: {
              type: 'object',
              properties: {
                used: { type: 'number', description: 'Used memory in MB' },
                total: { type: 'number', description: 'Total memory in MB' },
                percentage: { type: 'number', description: 'Memory usage percentage' }
              }
            },
            system: {
              type: 'object',
              properties: {
                platform: { type: 'string' },
                nodeVersion: { type: 'string' },
                pid: { type: 'number' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'System is unhealthy',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number' },
        message: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  async getHealth(): Promise<HealthCheckResponse> {
    try {
      const healthStatus = await this.healthService.getHealthStatus();
      
      // If the system is unhealthy, return 503 status
      if (healthStatus.status === 'unhealthy') {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Service is currently unhealthy',
            error: 'Service Unavailable',
            details: healthStatus,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      
      return healthStatus;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Health check failed',
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('ready')
  @ApiOperation({ 
    summary: 'Get readiness status',
    description: 'Simple endpoint to check if the service is ready to accept requests'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'OK' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is not ready'
  })
  async getReadiness(): Promise<{ status: string; timestamp: string }> {
    try {
      return await this.healthService.getSimpleHealthStatus();
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Service is not ready',
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('live')
  @ApiOperation({ 
    summary: 'Get liveness status',
    description: 'Simple endpoint to check if the service is alive (basic ping)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'alive' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', description: 'Uptime in seconds' }
      }
    }
  })
  async getLiveness(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}