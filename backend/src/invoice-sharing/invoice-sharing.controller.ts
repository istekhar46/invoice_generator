import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InvoiceSharingService } from './invoice-sharing.service';
import { CreateInvoiceShareDto } from './invoice-sharing.dto';

@Controller('invoices/:invoiceId/share')
export class InvoiceSharingController {
  constructor(private readonly sharing: InvoiceSharingService) {}
  @Get()
  status(@CurrentUser('id') userId: string, @Param('invoiceId') invoiceId: string) {
    return this.sharing.status(userId, invoiceId);
  }
  @Post()
  @HttpCode(200)
  create(
    @CurrentUser('id') userId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: CreateInvoiceShareDto,
  ) {
    return this.sharing.create(userId, invoiceId, body.createIfMissing);
  }
  @Delete()
  @HttpCode(204)
  revoke(@CurrentUser('id') userId: string, @Param('invoiceId') invoiceId: string) {
    return this.sharing.revoke(userId, invoiceId);
  }
}

@Public()
@Controller('public/invoice')
export class PublicInvoiceController {
  constructor(private readonly sharing: InvoiceSharingService) {}
  @Get()
  read(@Headers('authorization') authorization: string | undefined) {
    return this.sharing.read(authorization);
  }
}
