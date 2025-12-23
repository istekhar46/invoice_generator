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
} from 'class-validator';
import { CreateLineItemDto } from './create-line-item.dto';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Customer ID for the invoice',
    example: 'cuid123456789',
  })
  @IsString()
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId!: string;

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