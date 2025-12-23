import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';

export class CustomerQueryDto {
  @ApiProperty({
    description: 'Search term to filter customers by name, email, phone, or address',
    example: 'john',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Field to sort by',
    example: 'name',
    enum: ['name', 'createdAt'],
    required: false,
  })
  @IsOptional()
  @IsIn(['name', 'createdAt'])
  sortBy?: 'name' | 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}