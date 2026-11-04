import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
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
import { PaymentEntryKind } from '@prisma/client';

const raw = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key];
const trimmed = ({ obj, key }: { obj: Record<string, unknown>; key: string }) =>
  typeof obj[key] === 'string' ? obj[key].trim() : obj[key];

export class PaymentRequestDto {
  @ApiProperty({ maxLength: 100 })
  @Transform(raw)
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,100}$/)
  requestId!: string;

  @ApiProperty({ example: '2026-11-03' })
  @Transform(raw)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  paymentDate!: string;
}
export class RecordUpiPaymentDto extends PaymentRequestDto {
  @ApiProperty({ type: String, example: '125.50' })
  @Transform(raw)
  @IsString()
  @Matches(/^\d{1,14}(?:\.\d{1,2})?$/)
  amount!: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimmed)
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimmed)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
export class ReversePaymentDto extends PaymentRequestDto {
  @ApiProperty({ maxLength: 1000 })
  @Transform(trimmed)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
export class PaymentInvoiceQueryDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimmed)
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
export class PaymentHistoryQueryDto extends PaymentInvoiceQueryDto {
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(raw)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  invoiceId?: string;

  @ApiPropertyOptional({ enum: PaymentEntryKind })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(raw)
  @IsEnum(PaymentEntryKind)
  kind?: PaymentEntryKind;

  @ApiPropertyOptional({ enum: ['all', 'active', 'reversed'] })
  @Transform(raw)
  @IsIn(['all', 'active', 'reversed'])
  status: 'all' | 'active' | 'reversed' = 'all';

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(raw)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateFrom?: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(raw)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateTo?: string;
}
