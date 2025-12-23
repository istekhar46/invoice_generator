import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsEnum, IsString, IsDate, IsIn, IsInt, Min, Max } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class InvoiceQueryDto {
  @ApiProperty({
    description: 'Filter by invoice status',
    example: 'DRAFT',
    enum: InvoiceStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiProperty({
    description: 'Filter by customer ID',
    example: 'cuid123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({
    description: 'Filter invoices from this date (inclusive)',
    example: '2023-01-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiProperty({
    description: 'Filter invoices to this date (inclusive)',
    example: '2023-12-31T23:59:59.999Z',
    type: 'string',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @ApiProperty({
    description: 'Field to sort by',
    example: 'createdAt',
    enum: ['invoiceNumber', 'createdAt', 'serviceDate', 'total'],
    required: false,
  })
  @IsOptional()
  @IsIn(['invoiceNumber', 'createdAt', 'serviceDate', 'total'])
  sortBy?: 'invoiceNumber' | 'createdAt' | 'serviceDate' | 'total';

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}