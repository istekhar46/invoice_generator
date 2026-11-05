import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';
import { DatabaseModule } from '../database/database.module';
import { ShareToken } from './share-token';
import { InvoiceSharingService } from './invoice-sharing.service';
import { InvoiceSharingController, PublicInvoiceController } from './invoice-sharing.controller';

@Module({
  imports: [DatabaseModule, ConfigModule, JwtModule.register({})],
  controllers: [InvoiceSharingController, PublicInvoiceController],
  providers: [ShareToken, InvoiceSharingService],
})
export class InvoiceSharingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((_request: Request, response: Response, next: NextFunction) => {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Referrer-Policy', 'no-referrer');
        response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        next();
      })
      .forRoutes(InvoiceSharingController, PublicInvoiceController);
  }
}
