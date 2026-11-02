import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceDefaultsController } from './invoice-defaults.controller';
import { InvoiceDefaultsService } from './invoice-defaults.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InvoiceController, InvoiceDefaultsController],
  providers: [InvoiceService, InvoiceDefaultsService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
