import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';
import { LineItemResponseDto } from './line-item-response.dto';
import { CustomerResponseDto } from '../../customer/dto/customer-response.dto';

export class InvoiceResponseDto {
  @ApiProperty({
    description: 'Invoice ID',
    example: 'cuid123456789',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Unique invoice number',
    example: 'INV-2023-001',
  })
  @Expose()
  invoiceNumber!: string;

  @ApiProperty({
    description: 'Customer information',
    type: CustomerResponseDto,
  })
  @Expose()
  @Type(() => CustomerResponseDto)
  customer!: CustomerResponseDto;

  @ApiProperty({
    description: 'Date when the service was performed',
    example: '2023-12-01T00:00:00.000Z',
  })
  @Expose()
  serviceDate!: Date;

  @ApiProperty({
    description: 'Date when payment is due',
    example: '2023-12-31T00:00:00.000Z',
  })
  @Expose()
  dueDate!: Date;

  @ApiProperty({
    description: 'Subtotal before tax',
    example: 500.0,
  })
  @Expose()
  subtotal!: number;

  @ApiProperty({
    description: 'Tax rate applied',
    example: 0.08,
  })
  @Expose()
  taxRate!: number;

  @ApiProperty({
    description: 'Tax amount',
    example: 40.0,
  })
  @Expose()
  taxAmount!: number;

  @ApiProperty({
    description: 'Total amount including tax',
    example: 540.0,
  })
  @Expose()
  total!: number;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Work completed on schedule',
    required: false,
  })
  @Expose()
  notes?: string;

  @ApiProperty({
    description: 'Invoice status',
    example: 'DRAFT',
    enum: InvoiceStatus,
  })
  @Expose()
  status!: InvoiceStatus;

  @ApiProperty({
    description: 'Line items for the invoice',
    type: [LineItemResponseDto],
  })
  @Expose()
  @Type(() => LineItemResponseDto)
  lineItems!: LineItemResponseDto[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-12-01T10:00:00.000Z',
  })
  @Expose()
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-12-01T10:00:00.000Z',
  })
  @Expose()
  updatedAt!: Date;
}
