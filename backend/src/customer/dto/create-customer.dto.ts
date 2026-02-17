import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, Length, Matches, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer name',
    example: 'John Smith',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Customer name is required' })
  @MaxLength(200, { message: 'Customer name cannot exceed 200 characters' })
  name!: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'john.smith@example.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

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
    description: 'Customer address',
    example: '456 Oak Street',
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(300, { message: 'Address cannot exceed 300 characters' })
  address!: string;

  @ApiProperty({
    description: 'City',
    example: 'Los Angeles',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(100, { message: 'City cannot exceed 100 characters' })
  city!: string;

  @ApiProperty({
    description: 'State (2-letter code)',
    example: 'CA',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2, { message: 'State must be exactly 2 characters' })
  state!: string;

  @ApiProperty({
    description: 'ZIP code (5 digits or 5+4 format)',
    example: '90210',
    pattern: '^\\d{5}(-\\d{4})?$',
  })
  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, {
    message: 'ZIP code must be in format 12345 or 12345-6789',
  })
  zipCode!: string;
}
