import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNumber, ValidateIf, IsString, Matches, MaxLength, Min } from 'class-validator';
import { SUPPORTED_CURRENCIES, type DiscountType } from '../invoice-calculation';

export class InvoiceOptionsDto {
  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(80)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  invoiceNumber?: string;

  @ApiPropertyOptional({ default: 'USD' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['percentage', 'fixed'])
  discountType?: DiscountType;

  @ApiPropertyOptional({ default: 0 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ default: 0 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  shippingAmount?: number;

  @ApiPropertyOptional({ default: 0 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(200)
  paymentTerms?: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  terms?: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  purchaseOrderNumber?: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  shippingAddress?: string;

  @ApiPropertyOptional({ description: 'PNG/JPEG data URL, up to 256 KiB decoded' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(349552)
  @Matches(/^$|^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/)
  logoDataUrl?: string;
}
