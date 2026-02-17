import { ApiProperty } from '@nestjs/swagger';

export class UploadLogoDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Company logo image file (JPEG, PNG, GIF)',
  })
  logo!: Express.Multer.File;
}
