import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { LineItemType } from '@prisma/client';
import { SUPPORTED_CURRENCIES } from '../invoice/invoice-calculation';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCatalogItemDto {
  @ApiProperty({ enum: LineItemType })
  @IsEnum(LineItemType)
  type!: LineItemType;

  @ApiProperty({ maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ maxLength: 250 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trim)
  @IsString()
  @MaxLength(250)
  description?: string;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || null : value,
  )
  @IsString()
  @MaxLength(100)
  sku?: string | null;

  @ApiProperty({ maxLength: 50 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @ApiProperty({ minimum: 0, maximum: 100000 })
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(100000)
  rate!: number;

  @ApiProperty()
  @IsIn(SUPPORTED_CURRENCIES)
  currency!: string;
}

export class UpdateCatalogItemDto extends PartialType(CreateCatalogItemDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @IsBoolean()
  isArchived?: boolean;
}

export class CatalogQueryDto {
  @ApiPropertyOptional({ enum: ['tracked', 'untracked'], description: 'Stock tracking status.' })
  @IsOptional()
  @IsIn(['tracked', 'untracked'])
  tracking?: 'tracked' | 'untracked';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsEnum(LineItemType)
  type?: LineItemType;

  @IsOptional()
  @IsIn(['active', 'archived', 'all'])
  status?: 'active' | 'archived' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
