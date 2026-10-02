import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CustomerResponseDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 'cuid123456789',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Smith',
  })
  @Expose()
  name!: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'john.smith@example.com',
  })
  @Expose()
  email!: string;

  @ApiProperty({
    description: 'Phone number (international formats accepted)',
    example: '+91 97948 83638',
  })
  @Expose()
  phone!: string;

  @ApiProperty({
    description: 'Customer address',
    example: '456 Oak Street',
  })
  @Expose()
  address!: string;

  @ApiProperty({
    description: 'City',
    example: 'Los Angeles',
  })
  @Expose()
  city!: string;

  @ApiProperty({
    description: 'State, province, or region',
    example: 'Maharashtra',
  })
  @Expose()
  state!: string;

  @ApiProperty({
    description: 'Postal or ZIP code',
    example: '412308',
  })
  @Expose()
  zipCode!: string;

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
