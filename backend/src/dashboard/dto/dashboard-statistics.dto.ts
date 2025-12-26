import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class DashboardStatisticsDto {
  @ApiProperty({
    description: 'Total number of invoices',
    example: 150,
  })
  @Expose()
  totalInvoices!: number;

  @ApiProperty({
    description: 'Total revenue from paid invoices',
    example: 45000.50,
  })
  @Expose()
  totalRevenue!: number;

  @ApiProperty({
    description: 'Number of pending (sent) invoices',
    example: 25,
  })
  @Expose()
  pendingInvoices!: number;

  @ApiProperty({
    description: 'Number of paid invoices',
    example: 100,
  })
  @Expose()
  paidInvoices!: number;

  @ApiProperty({
    description: 'Number of draft invoices',
    example: 25,
  })
  @Expose()
  draftInvoices!: number;

  @ApiProperty({
    description: 'Average invoice value across all invoices',
    example: 300.00,
  })
  @Expose()
  averageInvoiceValue!: number;
}
