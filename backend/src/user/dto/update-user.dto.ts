import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ 
    description: 'Display name of the user',
    example: 'John Doe',
    required: false,
    minLength: 1,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Display name cannot be empty' })
  @MaxLength(100, { message: 'Display name cannot exceed 100 characters' })
  displayName?: string;

  @ApiProperty({ 
    description: 'Profile photo URL',
    example: 'https://example.com/photo.jpg',
    required: false 
  })
  @IsOptional()
  @IsUrl({}, { message: 'Photo URL must be a valid URL' })
  photoURL?: string;
}