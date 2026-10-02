import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';
import { LineItemResponseDto } from './line-item-response.dto';
import { CustomerResponseDto } from '../../customer/dto/customer-response.dto';

export class InvoiceResponseDto {
  @ApiProperty({ description: 'Invoice ID', example: 'cuid123456789' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Unique invoice number', example: 'INV-2023-001' })
  @Expose()
  invoiceNumber!: string;

  @ApiProperty({
    description: 'ID of the associated customer (null for quick invoices with no saved customer)',
    example: 'cuid123456789',
    nullable: true,
  })
  @Expose()
  customerId!: string | null;

  @ApiProperty({
    description: 'Customer information (populated when customerId is set)',
    type: CustomerResponseDto,
    nullable: true,
  })
  @Expose()
  @Type(() => CustomerResponseDto)
  customer!: CustomerResponseDto | null;

  @ApiProperty({ description: 'Date when the service was performed', example: '2023-12-01T00:00:00.000Z' })
  @Expose()
  serviceDate!: Date;

  @ApiProperty({ description: 'Date when payment is due', example: '2023-12-31T00:00:00.000Z' })
  @Expose()
  dueDate!: Date;

  @ApiProperty({ description: 'Subtotal before tax', example: 500.0 })
  @Expose()
  subtotal!: number;

  @ApiProperty({ description: 'Tax rate applied', example: 0.08 })
  @Expose()
  taxRate!: number;

  @ApiProperty({ description: 'Tax amount', example: 40.0 })
  @Expose()
  taxAmount!: number;

  @ApiProperty({ description: 'Total amount including tax', example: 540.0 })
  @Expose()
  total!: number;

  @ApiProperty({ description: 'Additional notes', example: 'Work completed on schedule', required: false })
  @Expose()
  notes?: string;

  @ApiProperty({ description: 'Invoice status', example: 'DRAFT', enum: InvoiceStatus })
  @Expose()
  status!: InvoiceStatus;

  @ApiProperty({ description: 'Whether this is a quick invoice (inline company/customer details)', example: false })
  @Expose()
  isQuickInvoice!: boolean;

  // ─── Quick Invoice — Inline Company Fields ────────────────────────────────────

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCompanyName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCompanyAddress?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCompanyCity?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCompanyState?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCompanyZipCode?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCompanyPhone?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCompanyEmail?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCompanyTaxNumber?: string | null;

  // ─── Quick Invoice — Inline Customer Fields ───────────────────────────────────

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCustomerName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCustomerEmail?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCustomerPhone?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCustomerAddress?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCustomerCity?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCustomerState?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  quickCustomerZipCode?: string | null;

  // ─── Relations ────────────────────────────────────────────────────────────────

  @ApiProperty({ description: 'Line items for the invoice', type: [LineItemResponseDto] })
  @Expose()
  @Type(() => LineItemResponseDto)
  lineItems!: LineItemResponseDto[];

  @ApiProperty({ description: 'Creation timestamp', example: '2023-12-01T10:00:00.000Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2023-12-01T10:00:00.000Z' })
  @Expose()
  updatedAt!: Date;
}
