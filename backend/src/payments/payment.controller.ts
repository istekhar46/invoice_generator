import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PaymentHistoryQueryDto,
  PaymentInvoiceQueryDto,
  RecordUpiPaymentDto,
  ReversePaymentDto,
} from './payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}
  @Get('invoices') payable(
    @CurrentUser('id') userId: string,
    @Query() query: PaymentInvoiceQueryDto,
  ) {
    return this.payments.payableInvoices(userId, query);
  }
  @Get('invoices/:id') summary(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.payments.summary(userId, id);
  }
  @Get() history(@CurrentUser('id') userId: string, @Query() query: PaymentHistoryQueryDto) {
    return this.payments.history(userId, query);
  }
  @Post('invoices/:id/receipts') record(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: RecordUpiPaymentDto,
  ) {
    return this.payments.record(userId, id, dto);
  }
  @Post(':id/reversal') reverse(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ReversePaymentDto,
  ) {
    return this.payments.reverse(userId, id, dto);
  }
}
