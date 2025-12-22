import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    // Create PostgreSQL connection pool
    const connectionString = configService.get<string>('DATABASE_URL');
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      errorFormat: 'pretty',
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
      
      // Test database connection
      await this.$queryRaw`SELECT 1`;
      this.logger.log('Database connection test successful');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Disconnected from database');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }

  /**
   * Clean disconnect for graceful shutdown
   */
  async enableShutdownHooks(): Promise<void> {
    process.on('beforeExit', async () => {
      await this.$disconnect();
    });
  }

  /**
   * Health check method to verify database connectivity
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      throw new Error('Database connection failed');
    }
  }

  /**
   * Execute operations within a transaction
   */
  async executeTransaction<T>(
    operations: (prisma: Omit<PrismaClient, '$on' | '$connect' | '$disconnect' | '$transaction' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (prisma) => {
      return operations(prisma);
    });
  }

  /**
   * Soft delete implementation
   */
  async softDelete(model: string, where: any): Promise<any> {
    const modelDelegate = (this as any)[model];
    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`);
    }

    return modelDelegate.update({
      where,
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Find many with soft delete filtering
   */
  async findManyActive(model: string, args: any = {}): Promise<any[]> {
    const modelDelegate = (this as any)[model];
    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`);
    }

    return modelDelegate.findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }

  /**
   * Find unique with soft delete filtering
   */
  async findUniqueActive(model: string, args: any): Promise<any> {
    const modelDelegate = (this as any)[model];
    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`);
    }

    return modelDelegate.findUnique({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }
}