import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const raw = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key];

export class SaveRazorpayConnectionDto {
  @ApiProperty({ description: 'Key ID from the selected Razorpay mode.' })
  @Transform(raw)
  @IsString()
  @MaxLength(120)
  @Matches(/^rzp_(test|live)_[A-Za-z0-9]+$/)
  keyId!: string;

  @ApiProperty({ writeOnly: true, minLength: 1, maxLength: 256 })
  @Transform(raw)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  @Matches(/^\S+$/)
  keySecret!: string;
}
