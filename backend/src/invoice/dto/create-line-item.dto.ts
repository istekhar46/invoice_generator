import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, Max, MaxLength, Equals } from 'class-validator';
import { LineItemType } from '@prisma/client';

export class CreateLineItemDto {
  @ApiProperty({
    description: 'Type of line item',
    example: 'MATERIAL',
    enum: [LineItemType.MATERIAL],
  })
  @Equals(LineItemType.MATERIAL, { message: 'Only MATERIAL line items are supported' })
  type!: LineItemType;

  @ApiProperty({
    description: 'Description of the line item',
    example: 'Electrical outlet installation',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description!: string;

  @ApiProperty({
    description: 'Unit label for quantity',
    example: 'mtr',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Unit is required' })
  @MaxLength(50, { message: 'Unit cannot exceed 50 characters' })
  unit!: string;

  @ApiProperty({
    description: 'Quantity of the item',
    example: 2.5,
    minimum: 0.01,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0.01, { message: 'Quantity must be at least 0.01' })
  @Max(10000, { message: 'Quantity cannot exceed 10,000' })
  quantity!: number;

  @ApiProperty({
    description: 'Rate per unit',
    example: 75.0,
    minimum: 0,
    maximum: 100000,
  })
  @IsNumber({}, { message: 'Rate must be a number' })
  @Min(0, { message: 'Rate must be non-negative' })
  @Max(100000, { message: 'Rate cannot exceed 100,000' })
  rate!: number;
}
