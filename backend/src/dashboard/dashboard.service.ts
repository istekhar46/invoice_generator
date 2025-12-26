import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DashboardStatisticsDto } from './dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStatistics(userId: string): Promise<DashboardStatisticsDto> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get total count and sum of all invoices
    const totalStats = await this.prisma.invoice.aggregate({
      where: { userId },
      _count: true,
      _sum: { total: true },
    });

    // Group invoices by status to get counts
    const statusStats = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
      _sum: { total: true },
    });

    // Build status counts map
    const statusMap: Record<string, { count: number; total: number }> = {};
    statusStats.forEach((stat) => {
      statusMap[stat.status] = {
        count: stat._count,
        total: stat._sum.total || 0,
      };
    });

    // Calculate statistics
    const totalInvoices = totalStats._count;
    const totalValue = totalStats._sum.total || 0;
    const averageInvoiceValue = totalInvoices > 0 
      ? Math.round((totalValue / totalInvoices) * 100) / 100 
      : 0;

    // Revenue is only from paid invoices
    const paidStats = statusMap['PAID'] || { count: 0, total: 0 };
    const totalRevenue = Math.round(paidStats.total * 100) / 100;

    return {
      totalInvoices,
      totalRevenue,
      pendingInvoices: statusMap['SENT']?.count || 0,
      paidInvoices: statusMap['PAID']?.count || 0,
      draftInvoices: statusMap['DRAFT']?.count || 0,
      averageInvoiceValue,
    };
  }
}
