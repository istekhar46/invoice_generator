import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../invoice-calculation';

export class InvoiceDefaultsDto {
  @ApiProperty()
  @IsIn(SUPPORTED_CURRENCIES)
  currency!: string;

  @ApiProperty({ minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  taxRate!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  paymentTerms!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  notes!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  terms!: string;
}
