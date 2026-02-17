/**
 * Dashboard Statistics Service
 * Provides statistical calculations and data aggregation for the dashboard
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import type { Invoice, InvoiceStatus } from '../types/entities'

/**
 * Dashboard statistics interface
 */
export interface DashboardStatistics {
  totalInvoices: number
  totalRevenue: number
  pendingInvoices: number
  paidInvoices: number
  draftInvoices: number
  averageInvoiceValue: number
}

/**
 * Recent invoice summary for dashboard display
 */
export interface RecentInvoiceSummary {
  id: string
  invoiceNumber: string
  customerName?: string
  total: number
  status: InvoiceStatus
  serviceDate: Date
  createdAt: Date
}

/**
 * Dashboard statistics service class
 */
export class DashboardStatisticsService {
  /**
   * Calculate comprehensive dashboard statistics from invoices
   * Requirements: 10.1, 10.2, 10.3
   */
  static calculateStatistics(invoices: Invoice[]): DashboardStatistics {
    if (invoices.length === 0) {
      return {
        totalInvoices: 0,
        totalRevenue: 0,
        pendingInvoices: 0,
        paidInvoices: 0,
        draftInvoices: 0,
        averageInvoiceValue: 0,
      }
    }

    // Count invoices by status
    const statusCounts = invoices.reduce(
      (counts, invoice) => {
        counts[invoice.status] = (counts[invoice.status] || 0) + 1
        return counts
      },
      {} as Record<InvoiceStatus, number>
    )

    // Calculate total revenue from paid invoices only
    const totalRevenue = invoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.total, 0)

    // Calculate average invoice value across all invoices
    const totalValue = invoices.reduce((sum, invoice) => sum + invoice.total, 0)
    const averageInvoiceValue = totalValue / invoices.length

    return {
      totalInvoices: invoices.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
      pendingInvoices: statusCounts.sent || 0,
      paidInvoices: statusCounts.paid || 0,
      draftInvoices: statusCounts.draft || 0,
      averageInvoiceValue: Math.round(averageInvoiceValue * 100) / 100, // Round to 2 decimal places
    }
  }

  /**
   * Get pending invoices (sent but not paid)
   * Requirements: 10.3
   */
  static getPendingInvoices(invoices: Invoice[]): Invoice[] {
    return invoices
      .filter(invoice => invoice.status === 'sent')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  /**
   * Get recent invoices with proper sorting
   * Requirements: 10.4
   */
  static getRecentInvoices(invoices: Invoice[], limit: number = 5): Invoice[] {
    return invoices
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  }

  /**
   * Get recent invoice summaries for dashboard display
   * Requirements: 10.4
   */
  static getRecentInvoiceSummaries(
    invoices: Invoice[], 
    customerLookup: (customerId: string) => string | undefined,
    limit: number = 5
  ): RecentInvoiceSummary[] {
    return this.getRecentInvoices(invoices, limit).map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerId ? customerLookup(invoice.customerId) : undefined,
      total: invoice.total,
      status: invoice.status,
      serviceDate: invoice.serviceDate,
      createdAt: invoice.createdAt,
    }))
  }

  /**
   * Filter invoices by status
   * Requirements: 10.3
   */
  static filterByStatus(invoices: Invoice[], status: InvoiceStatus): Invoice[] {
    return invoices.filter(invoice => invoice.status === status)
  }

  /**
   * Get invoices within a date range
   */
  static getInvoicesInDateRange(
    invoices: Invoice[], 
    startDate: Date, 
    endDate: Date
  ): Invoice[] {
    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.createdAt)
      return invoiceDate >= startDate && invoiceDate <= endDate
    })
  }

  /**
   * Calculate revenue for a specific time period
   */
  static calculateRevenueForPeriod(
    invoices: Invoice[], 
    startDate: Date, 
    endDate: Date
  ): number {
    const periodInvoices = this.getInvoicesInDateRange(invoices, startDate, endDate)
    const revenue = periodInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.total, 0)
    
    return Math.round(revenue * 100) / 100
  }

  /**
   * Get top customers by revenue
   */
  static getTopCustomersByRevenue(
    invoices: Invoice[], 
    customerLookup: (customerId: string) => string | undefined,
    limit: number = 5
  ): Array<{ customerId: string; customerName?: string; revenue: number; invoiceCount: number }> {
    const customerStats = invoices
      .filter(invoice => invoice.status === 'paid' && invoice.customerId)
      .reduce((stats, invoice) => {
        const existing = stats.get(invoice.customerId!) || { revenue: 0, invoiceCount: 0 }
        stats.set(invoice.customerId!, {
          revenue: existing.revenue + invoice.total,
          invoiceCount: existing.invoiceCount + 1,
        })
        return stats
      }, new Map<string, { revenue: number; invoiceCount: number }>())

    return Array.from(customerStats.entries())
      .map(([customerId, stats]) => ({
        customerId,
        customerName: customerLookup(customerId),
        revenue: Math.round(stats.revenue * 100) / 100,
        invoiceCount: stats.invoiceCount,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
  }
}

/**
 * Error class for dashboard statistics operations
 */
export class DashboardStatisticsError extends Error {
  public cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)
    this.name = 'DashboardStatisticsError'
    this.cause = cause
  }
}