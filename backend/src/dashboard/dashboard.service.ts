import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DashboardStatisticsDto } from './dto/dashboard-statistics.dto';
import { money } from '../invoice/invoice-calculation';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStatistics(userId: string): Promise<DashboardStatisticsDto> {
    if (!(await this.prisma.user.findUnique({ where: { id: userId } })))
      throw new NotFoundException('User not found');
    const groups = await this.prisma.invoice.groupBy({
      by: ['currency', 'status'],
      where: { userId },
      _count: true,
      _sum: { total: true },
    });
    const counts = { DRAFT: 0, SENT: 0, PAID: 0 };
    const currencies = new Map<string, { count: number; total: number; revenue: number }>();
    for (const group of groups) {
      counts[group.status] += group._count;
      const value = currencies.get(group.currency) ?? { count: 0, total: 0, revenue: 0 };
      value.count += group._count;
      value.total += group._sum.total ?? 0;
      if (group.status === 'PAID') value.revenue += group._sum.total ?? 0;
      currencies.set(group.currency, value);
    }
    const currencyTotals = Array.from(currencies, ([currency, values]) => ({
      currency,
      totalRevenue: money(values.revenue, currency),
      averageInvoiceValue: money(values.total / values.count, currency),
    })).sort((a, b) => a.currency.localeCompare(b.currency));
    const usd = currencyTotals.find((value) => value.currency === 'USD');
    return {
      totalInvoices: counts.DRAFT + counts.SENT + counts.PAID,
      pendingInvoices: counts.SENT,
      paidInvoices: counts.PAID,
      draftInvoices: counts.DRAFT,
      // Retained scalar fields describe USD only; all currency amounts are separate.
      totalRevenue: usd?.totalRevenue ?? 0,
      averageInvoiceValue: usd?.averageInvoiceValue ?? 0,
      currencyTotals,
    };
  }
}
