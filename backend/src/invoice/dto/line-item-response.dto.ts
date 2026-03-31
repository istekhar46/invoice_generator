import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { LineItemType } from '@prisma/client';

export class LineItemResponseDto {
  @ApiProperty({
    description: 'Line item ID',
    example: 'cuid123456789',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Type of line item',
    example: 'LABOR',
    enum: LineItemType,
  })
  @Expose()
  type!: LineItemType;

  @ApiProperty({
    description: 'Description of the line item',
    example: 'Electrical outlet installation',
  })
  @Expose()
  description!: string;

  @ApiProperty({
    description: 'Unit label for quantity',
    example: 'bundle',
  })
  @Expose()
  unit!: string;

  @ApiProperty({
    description: 'Quantity of the item',
    example: 2.5,
  })
  @Expose()
  quantity!: number;

  @ApiProperty({
    description: 'Rate per unit',
    example: 75.0,
  })
  @Expose()
  rate!: number;

  @ApiProperty({
    description: 'Total amount for this line item (quantity * rate)',
    example: 187.5,
  })
  @Expose()
  amount!: number;
}
