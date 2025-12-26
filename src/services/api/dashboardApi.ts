import { apiClient } from './apiClient'

/**
 * Dashboard Statistics DTO
 */
export interface DashboardStatisticsDto {
  totalInvoices: number
  totalRevenue: number
  pendingInvoices: number
  paidInvoices: number
  draftInvoices: number
  averageInvoiceValue: number
}

/**
 * Dashboard API service
 */
export class DashboardApi {
  /**
   * Get dashboard statistics
   */
  async getStatistics(): Promise<DashboardStatisticsDto> {
    return apiClient.get<DashboardStatisticsDto>('/dashboard/statistics')
  }
}

// Export singleton instance
export const dashboardApi = new DashboardApi()
