import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, Matches, MaxLength, MinLength } from 'class-validator';

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
    description: 'Phone number (international formats accepted)',
    example: '+919794883638',
    maxLength: 30,
  })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @MaxLength(30, { message: 'Phone number cannot exceed 30 characters' })
  @Matches(/^\+?[\d\s().-]{7,30}$/, {
    message: 'Phone number must be valid (e.g. +1 555 123 4567, +91 97948 83638)',
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
    description: 'State, province, or region',
    example: 'Maharashtra',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'State / Province / Region is required' })
  @MinLength(2, { message: 'State / Province / Region must be at least 2 characters' })
  @MaxLength(100, { message: 'State / Province / Region cannot exceed 100 characters' })
  state!: string;

  @ApiProperty({
    description: 'Postal / ZIP code (international formats accepted)',
    example: '412308',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: 'Postal code is required' })
  @MaxLength(20, { message: 'Postal code cannot exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9][\w\s-]{1,19}$/, {
    message: 'Postal code must be a valid format (e.g. 10001, 412308, SW1A 1AA)',
  })
  zipCode!: string;
}
