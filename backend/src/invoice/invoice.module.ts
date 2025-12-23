import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}