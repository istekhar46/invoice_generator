import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { StockActionKind } from '@prisma/client';

// Global implicit conversion must not turn numbers/booleans into valid strings.
const raw = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key];
const trimmed = ({ obj, key }: { obj: Record<string, unknown>; key: string }) =>
  typeof obj[key] === 'string' ? obj[key].trim() : obj[key];

export class StockRequestDto {
  @ApiProperty({ maxLength: 100, description: 'Unique retry identifier for this account.' })
  @Transform(raw)
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,100}$/)
  requestId!: string;

  @ApiProperty({ maxLength: 500 })
  @Transform(trimmed)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @ApiProperty({ example: '2026-11-03', description: 'Effective date; does not reorder stock.' })
  @Transform(raw)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  effectiveDate!: string;
}

export class OpeningStockDto extends StockRequestDto {
  @ApiProperty({
    maxLength: 50,
    description: 'Current product unit; refresh if the catalog unit changed.',
  })
  @Transform(trimmed)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @ApiProperty({
    type: String,
    example: '1.250',
    description: 'Current available stock, including zero.',
  })
  @Transform(raw)
  @IsString()
  @Matches(/^\d{1,15}(?:\.\d{1,3})?$/)
  quantity!: string;
}

export class AdjustStockDto extends OpeningStockDto {
  @ApiProperty({ enum: ['IN', 'OUT'] })
  @Transform(raw)
  @IsIn(['IN', 'OUT'])
  direction!: 'IN' | 'OUT';
}

class InventoryPageDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class InventoryBalanceQueryDto extends InventoryPageDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimmed)
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'archived', 'all'], default: 'active' })
  @Transform(raw)
  @IsIn(['active', 'archived', 'all'])
  status: 'active' | 'archived' | 'all' = 'active';
}

export class InventoryHistoryQueryDto extends InventoryPageDto {
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(raw)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  catalogItemId?: string;

  @ApiPropertyOptional({ enum: StockActionKind })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(raw)
  @IsEnum(StockActionKind)
  kind?: StockActionKind;
}

export class InventoryAvailabilityQueryDto {
  @ApiProperty({ description: 'Comma-separated catalog IDs, at most 100.' })
  @Transform(({ obj }: { obj: Record<string, unknown> }) =>
    typeof obj.ids === 'string' ? obj.ids.split(',') : obj.ids,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  ids!: string[];
}
