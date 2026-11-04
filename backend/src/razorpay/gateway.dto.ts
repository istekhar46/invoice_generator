import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { GatewayLinkState, RazorpayMode } from '@prisma/client';
import { PaymentInvoiceQueryDto } from '../payments/payment.dto';
const raw = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key];

export class CreateGatewayLinkDto {
  @ApiProperty()
  @Transform(raw)
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,100}$/)
  requestId!: string;
  @ApiProperty()
  @Transform(raw)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  invoiceId!: string;
  @ApiProperty({ enum: RazorpayMode })
  @Transform(raw)
  @IsEnum(RazorpayMode)
  mode!: RazorpayMode;
}
export class GatewayLinkQueryDto extends PaymentInvoiceQueryDto {
  @ApiPropertyOptional({ enum: RazorpayMode })
  @IsEnum(RazorpayMode)
  mode: RazorpayMode = RazorpayMode.TEST;
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @Transform(raw)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  invoiceId?: string;
  @ApiPropertyOptional({ enum: GatewayLinkState })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsEnum(GatewayLinkState)
  state?: GatewayLinkState;
}
export class WebhookSecretDto {
  @ApiProperty({ writeOnly: true, minLength: 16, maxLength: 256 })
  @Transform(raw)
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  @Matches(/^\S+$/)
  secret!: string;
}
