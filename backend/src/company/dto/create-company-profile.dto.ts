import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { IsValidBusinessName } from '../validators/business-validation.decorator';

export class CreateCompanyProfileDto {
  @ApiProperty({
    description: 'Business name',
    example: 'ABC Electrical Services',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Business name is required' })
  @MaxLength(200, { message: 'Business name cannot exceed 200 characters' })
  @IsValidBusinessName()
  businessName!: string;

  @ApiProperty({
    description: 'Business address',
    example: '123 Main Street',
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(300, { message: 'Address cannot exceed 300 characters' })
  address!: string;

  @ApiProperty({
    description: 'City',
    example: 'New York',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(100, { message: 'City cannot exceed 100 characters' })
  city!: string;

  @ApiProperty({
    description: 'State, province, or region',
    example: 'California',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'State / Province / Region is required' })
  @MaxLength(100, { message: 'State / Province / Region cannot exceed 100 characters' })
  state!: string;

  @ApiProperty({
    description: 'Postal / ZIP code (international formats accepted)',
    example: '10001',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: 'Postal code is required' })
  @MaxLength(20, { message: 'Postal code cannot exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9][\w\s\-]{1,19}$/, {
    message: 'Postal code must be a valid format (e.g. 10001, SW1A 1AA, 110001)',
  })
  zipCode!: string;

  @ApiProperty({
    description: 'Phone number (international formats accepted)',
    example: '+1 555 123 4567',
    maxLength: 30,
  })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @MaxLength(30, { message: 'Phone number cannot exceed 30 characters' })
  @Matches(/^\+?[\d\s().\-]{7,30}$/, {
    message: 'Phone number must be valid (e.g. +1 555 123 4567, +44 20 7946 0958)',
  })
  phone!: string;

  @ApiProperty({
    description: 'Business email address',
    example: 'contact@business.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @ApiPropertyOptional({
    description: 'Tax / VAT / GST identification number (optional)',
    example: '12-3456789',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Tax number cannot exceed 50 characters' })
  taxNumber?: string;

  @ApiProperty({
    description: 'Default tax / GST rate (as decimal, e.g., 0.18 for 18%)',
    example: 0.18,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber({}, { message: 'Default tax rate must be a number' })
  @Min(0, { message: 'Default tax rate cannot be negative' })
  @Max(1, { message: 'Default tax rate cannot exceed 100% (1.0)' })
  defaultTaxRate!: number;
}
