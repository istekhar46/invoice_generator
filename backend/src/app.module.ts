import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { CustomerModule } from './customer/customer.module';
import { InvoiceModule } from './invoice/invoice.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SanitizationInterceptor } from './common/interceptors/sanitization.interceptor';

@Module({
  imports: [
    // Global configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),
    
    // Database module
    DatabaseModule,
    
    // Authentication module
    AuthModule,
    
    // User management module
    UserModule,
    
    // Company profile module
    CompanyModule,
    
    // Customer management module
    CustomerModule,
    
    // Invoice management module
    InvoiceModule,
    
    // Health check module
    HealthModule,
    
    // Rate limiting module
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10) * 1000, // Convert to milliseconds
            limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
          },
        ],
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    
    // Global validation pipe
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: {
            enableImplicitConversion: true,
          },
          disableErrorMessages: process.env.NODE_ENV === 'production',
        }),
    },
    
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    
    // Global JWT authentication guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
