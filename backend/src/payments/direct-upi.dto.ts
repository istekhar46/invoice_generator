import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// An application syntax check only; it does not establish that the VPA exists.
export const UPI_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9.-]*$/;
const trimInput = ({ obj, key }: TransformFnParams): unknown => {
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : value;
};
export class DirectUpiDetailsDto {
  @ApiProperty({ description: 'Owner-provided UPI ID; not bank verified.' })
  @Transform(trimInput)
  @IsString()
  @MaxLength(255)
  @Matches(UPI_ID_PATTERN, { message: 'Enter a UPI ID such as business@bank.' })
  upiId!: string;

  @ApiProperty()
  @Transform(trimInput)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[^\p{C}]+$/u, { message: 'Payee name cannot contain control characters.' })
  payeeName!: string;
}
