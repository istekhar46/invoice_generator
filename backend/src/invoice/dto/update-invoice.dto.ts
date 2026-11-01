import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateQuickInvoiceDto } from './create-quick-invoice.dto';

export class UpdateInvoiceDto extends PartialType(
  OmitType(CreateQuickInvoiceDto, ['isQuickInvoice', 'clientRequestId'] as const),
) {}
