import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, PoolConfig } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString: string = process.env.DATABASE_URL!;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    const sslEnabled: boolean = process.env.PG_SSL === 'true';
    const sslRejectUnauthorized: boolean = process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false';

    // If PG_CA_CERT is defined, parse it correctly (handle both escaped and unescaped newlines)
    const caCert: string | undefined = process.env.PG_CA_CERT
      ?.replace(/\\n/g, '\n')
      ?.replace(/\\"/g, '"')
      ?.trim();

    let poolConfig: PoolConfig;

    if (sslEnabled) {
      // Build connection string with sslmode=require for Aiven compatibility
      let connectionStringWithSsl = connectionString;
      if (!connectionString.includes('sslmode=')) {
        const separator = connectionString.includes('?') ? '&' : '?';
        connectionStringWithSsl = `${connectionString}${separator}sslmode=require`;
      }

      // Configure SSL options
      const sslConfig: PoolConfig['ssl'] = sslRejectUnauthorized && caCert
        ? {
            rejectUnauthorized: true,
            ca: caCert,
          }
        : {
            rejectUnauthorized: false,
          };

      poolConfig = {
        connectionString: connectionStringWithSsl,
        ssl: sslConfig,
      };

      this.logger.debug(`SSL enabled with rejectUnauthorized: ${sslRejectUnauthorized && caCert ? 'true' : 'false'}`);
    } else {
      poolConfig = {
        connectionString,
        ssl: false,
      };
    }

    const pool: Pool = new Pool(poolConfig);
    const adapter: PrismaPg = new PrismaPg(pool);

    super({
      adapter,
      errorFormat: 'pretty',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Successfully connected to database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  async healthCheck(): Promise<void> {
    try {
      await this.$queryRaw`SELECT 1`;
    } catch (error: unknown) {
      this.logger.error('Database health check failed:', error as Error);
      throw error;
    }
  }
}
