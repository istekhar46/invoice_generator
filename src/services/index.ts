/**
 * Service layer exports for the Electrician Invoice Generation Web App
 */

export { LocalStorageService, LocalStorageRepository, LocalStorageError, DateSerializer } from './localStorage.service'
export { InvoiceCalculationService, CalculationError } from './invoiceCalculation.service'
export { 
  DashboardStatisticsService, 
  DashboardStatisticsError,
  type DashboardStatistics,
  type RecentInvoiceSummary 
} from './dashboardStatistics.service'
export type { PDFGeneratorService } from './pdf'
export {
  PDFGeneratorServiceImpl,
  pdfGeneratorService,
  downloadInvoicePDF,
  previewInvoicePDF,
  InvoicePDFTemplate,
} from './pdf'
export { 
  errorHandlerService, 
  handleError, 
  withErrorHandling, 
  withSyncErrorHandling,
  type ErrorReport,
  type ErrorHandlerConfig,
} from './errorHandler.service'

// Cache management services
export {
  CacheInvalidationService,
  createCacheInvalidationService,
  getCacheInvalidationService,
  initializeCacheService,
} from './cache'

// Prefetch services
export {
  PrefetchService,
  getPrefetchService,
  createPrefetchService,
} from './prefetch'