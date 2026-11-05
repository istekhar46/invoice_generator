import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class CreateInvoiceShareDto {
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key])
  @IsBoolean()
  createIfMissing!: boolean;
}
