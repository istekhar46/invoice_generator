import { OmitType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { QuoteStatus } from '@prisma/client';
import { InvoiceOptionsDto } from '../invoice/dto/invoice-options.dto';
import { CreateLineItemDto } from '../invoice/dto/create-line-item.dto';
const raw = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key];

export class QuoteVersionDto {
  @IsInt() @Min(1) version!: number;
}
export class QuoteContentDto extends OmitType(InvoiceOptionsDto, ['invoiceNumber'] as const) {
  @Transform(raw) @IsString() @IsNotEmpty() @MaxLength(100) customerId!: string;
  @Transform(raw)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  quoteDate!: string;
  @Transform(raw)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  validUntil!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateLineItemDto)
  lineItems!: CreateLineItemDto[];
  @IsNumber() @Min(0) @Max(1) taxRate!: number;
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(1000) notes?: string;
}
export class CreateQuoteDto extends QuoteContentDto {
  @Transform(raw) @IsString() @Matches(/^[A-Za-z0-9_-]{1,100}$/) clientRequestId!: string;
}
export class UpdateQuoteDto extends QuoteContentDto {
  @IsInt() @Min(1) version!: number;
}
export class QuoteStatusDto extends QuoteVersionDto {
  @Transform(raw) @IsEnum(QuoteStatus) status!: QuoteStatus;
}
export class ConvertQuoteDto extends QuoteVersionDto {
  @Transform(raw)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  serviceDate!: string;
  @Transform(raw)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dueDate!: string;
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(raw)
  @IsString()
  @MaxLength(80)
  invoiceNumber?: string;
}
export class QuoteQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(raw)
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(raw)
  @IsString()
  @MaxLength(200)
  search?: string;
  @ValidateIf((_object, value) => value !== undefined) @IsIn(['expired']) expiry?: 'expired';
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
