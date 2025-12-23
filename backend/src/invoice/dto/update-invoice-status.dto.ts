import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceStatusDto {
  @ApiProperty({
    description: 'New status for the invoice',
    example: 'SENT',
    enum: InvoiceStatus,
  })
  @IsEnum(InvoiceStatus, { message: 'Status must be DRAFT, SENT, or PAID' })
  status!: InvoiceStatus;
}