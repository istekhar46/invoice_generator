import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsNumber,
  Min,
  Max,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  IsValidTaxNumber,
  IsValidBusinessName,
  IsValidStateCode,
} from '../validators/business-validation.decorator';

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
    description: 'State (2-letter code)',
    example: 'NY',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2, { message: 'State must be exactly 2 characters' })
  @IsValidStateCode()
  state!: string;

  @ApiProperty({
    description: 'ZIP code (5 digits or 5+4 format)',
    example: '10001',
    pattern: '^\\d{5}(-\\d{4})?$',
  })
  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, {
    message: 'ZIP code must be in format 12345 or 12345-6789',
  })
  zipCode!: string;

  @ApiProperty({
    description: 'Phone number',
    example: '(555) 123-4567',
    pattern: '^\\(?\\d{3}\\)?[- ]?\\d{3}[- ]?\\d{4}$',
  })
  @IsString()
  @Matches(/^\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}$/, {
    message: 'Phone number must be in format (555) 123-4567 or 555-123-4567',
  })
  phone!: string;

  @ApiProperty({
    description: 'Business email address',
    example: 'contact@abcelectrical.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @ApiProperty({
    description: 'Tax identification number',
    example: '12-3456789',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Tax number is required' })
  @MaxLength(50, { message: 'Tax number cannot exceed 50 characters' })
  @IsValidTaxNumber()
  taxNumber!: string;

  @ApiProperty({
    description: 'Default labor rate per hour',
    example: 75.0,
    minimum: 0,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'Default labor rate must be a number' })
  @Min(0, { message: 'Default labor rate cannot be negative' })
  @Max(10000, { message: 'Default labor rate cannot exceed $10,000' })
  defaultLaborRate!: number;

  @ApiProperty({
    description: 'Default tax rate (as decimal, e.g., 0.08 for 8%)',
    example: 0.08,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber({}, { message: 'Default tax rate must be a number' })
  @Min(0, { message: 'Default tax rate cannot be negative' })
  @Max(1, { message: 'Default tax rate cannot exceed 100% (1.0)' })
  defaultTaxRate!: number;
}