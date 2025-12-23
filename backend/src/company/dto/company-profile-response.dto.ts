import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CompanyProfileResponseDto {
  @ApiProperty({
    description: 'Company profile ID',
    example: 'clp1234567890abcdef',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'User ID who owns this company profile',
    example: 'clp0987654321fedcba',
  })
  @Expose()
  userId!: string;

  @ApiProperty({
    description: 'Business name',
    example: 'ABC Electrical Services',
  })
  @Expose()
  businessName!: string;

  @ApiProperty({
    description: 'Business address',
    example: '123 Main Street',
  })
  @Expose()
  address!: string;

  @ApiProperty({
    description: 'City',
    example: 'New York',
  })
  @Expose()
  city!: string;

  @ApiProperty({
    description: 'State',
    example: 'NY',
  })
  @Expose()
  state!: string;

  @ApiProperty({
    description: 'ZIP code',
    example: '10001',
  })
  @Expose()
  zipCode!: string;

  @ApiProperty({
    description: 'Phone number',
    example: '(555) 123-4567',
  })
  @Expose()
  phone!: string;

  @ApiProperty({
    description: 'Business email address',
    example: 'contact@abcelectrical.com',
  })
  @Expose()
  email!: string;

  @ApiProperty({
    description: 'Tax identification number',
    example: '12-3456789',
  })
  @Expose()
  taxNumber!: string;

  @ApiProperty({
    description: 'Default labor rate per hour',
    example: 75.0,
  })
  @Expose()
  defaultLaborRate!: number;

  @ApiProperty({
    description: 'Default tax rate',
    example: 0.08,
  })
  @Expose()
  defaultTaxRate!: number;

  @ApiProperty({
    description: 'Company logo URL',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @Expose()
  logoUrl?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-12-01T10:00:00.000Z',
  })
  @Expose()
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-12-01T10:00:00.000Z',
  })
  @Expose()
  updatedAt!: Date;
}