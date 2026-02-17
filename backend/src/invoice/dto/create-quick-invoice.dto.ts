import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { CreateLineItemDto } from './create-line-item.dto';

export class CreateQuickInvoiceDto {
  @ApiProperty({
    description: 'Flag to identify this as a quick invoice',
    example: true,
  })
  @IsBoolean()
  isQuickInvoice!: true;

  // Optional customer ID - if provided, uses saved customer
  @ApiProperty({
    description: 'Customer ID (optional, can use inline customer details instead)',
    example: 'cuid123456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerId?: string;

  // Inline company details
  @ApiProperty({
    description: 'Company business name',
    example: 'Acme Electric Co.',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCompanyName?: string;

  @ApiProperty({
    description: 'Company address',
    example: '123 Main St',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCompanyAddress?: string;

  @ApiProperty({
    description: 'Company city',
    example: 'Springfield',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCompanyCity?: string;

  @ApiProperty({
    description: 'Company state',
    example: 'IL',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCompanyState?: string;

  @ApiProperty({
    description: 'Company zip code',
    example: '62701',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCompanyZipCode?: string;

  @ApiProperty({
    description: 'Company phone',
    example: '+1-555-123-4567',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCompanyPhone?: string;

  @ApiProperty({
    description: 'Company email',
    example: 'billing@acmeelectric.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCompanyEmail?: string;

  @ApiProperty({
    description: 'Company tax number',
    example: '12-3456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCompanyTaxNumber?: string;

  // Inline customer details
  @ApiProperty({
    description: 'Customer name',
    example: 'John Smith',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCustomerName?: string;

  @ApiProperty({
    description: 'Customer email',
    example: 'john.smith@example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCustomerEmail?: string;

  @ApiProperty({
    description: 'Customer phone',
    example: '+1-555-987-6543',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCustomerPhone?: string;

  @ApiProperty({
    description: 'Customer address',
    example: '456 Oak Ave',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCustomerAddress?: string;

  @ApiProperty({
    description: 'Customer city',
    example: 'Springfield',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCustomerCity?: string;

  @ApiProperty({
    description: 'Customer state',
    example: 'IL',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCustomerState?: string;

  @ApiProperty({
    description: 'Customer zip code',
    example: '62702',
    required: false,
  })
  @IsString()
  @IsOptional()
  quickCustomerZipCode?: string;

  // Standard invoice fields
  @ApiProperty({
    description: 'Date when the service was performed',
    example: '2023-12-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate({ message: 'Service date must be a valid date' })
  serviceDate!: Date;

  @ApiProperty({
    description: 'Date when payment is due',
    example: '2023-12-31T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate({ message: 'Due date must be a valid date' })
  dueDate!: Date;

  @ApiProperty({
    description: 'Array of line items for the invoice',
    type: [CreateLineItemDto],
    minItems: 1,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineItemDto)
  @ArrayMinSize(1, { message: 'At least one line item is required' })
  lineItems!: CreateLineItemDto[];

  @ApiProperty({
    description: 'Additional notes for the invoice',
    example: 'Work completed on schedule',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Notes cannot exceed 1000 characters' })
  notes?: string;

  @ApiProperty({
    description: 'Tax rate as a decimal (e.g., 0.08 for 8%)',
    example: 0.08,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber({}, { message: 'Tax rate must be a number' })
  @Min(0, { message: 'Tax rate must be non-negative' })
  @Max(1, { message: 'Tax rate cannot exceed 1 (100%)' })
  taxRate!: number;
}
