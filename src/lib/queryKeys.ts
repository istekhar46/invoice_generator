/**
 * Centralized Query Key Factory
 * 
 * This factory provides a consistent structure for all TanStack Query keys
 * across the application. It ensures proper cache invalidation and prevents
 * key conflicts between different entities.
 * 
 * Requirements: 7.5 - consistent query key structure for all entities
 */

import type { 
  CustomerQueryParams, 
  InvoiceQueryParams 
} from '../services/api'

/**
 * Root query key factory
 * Provides the foundation for all entity-specific query keys
 */
export const queryKeys = {
  // Authentication keys
  auth: ['auth'] as const,
  profile: () => [...queryKeys.auth, 'profile'] as const,

  // Customer keys
  customers: ['customers'] as const,
  customersList: (params?: CustomerQueryParams) => 
    [...queryKeys.customers, 'list', params || {}] as const,
  customer: (id: string) => [...queryKeys.customers, 'detail', id] as const,
  customersAll: () => [...queryKeys.customers, 'all'] as const,

  // Invoice keys
  invoices: ['invoices'] as const,
  invoicesList: (params?: InvoiceQueryParams) => 
    [...queryKeys.invoices, 'list', params || {}] as const,
  invoice: (id: string) => [...queryKeys.invoices, 'detail', id] as const,
  invoicesByStatus: (status: 'DRAFT' | 'SENT' | 'PAID', params?: Omit<InvoiceQueryParams, 'status'>) =>
    [...queryKeys.invoices, 'status', status, params || {}] as const,
  invoicesByCustomer: (customerId: string, params?: Omit<InvoiceQueryParams, 'customerId'>) =>
    [...queryKeys.invoices, 'customer', customerId, params || {}] as const,
  invoicesByDateRange: (dateFrom: Date, dateTo: Date, params?: Omit<InvoiceQueryParams, 'dateFrom' | 'dateTo'>) =>
    [...queryKeys.invoices, 'dateRange', { dateFrom, dateTo }, params || {}] as const,

  // Company keys
  company: ['company'] as const,
  companyProfile: () => [...queryKeys.company, 'profile'] as const,

  // Health check keys
  health: ['health'] as const,
  healthStatus: () => [...queryKeys.health, 'status'] as const,

  // Dashboard keys
  dashboard: ['dashboard'] as const,
  dashboardStatistics: () => [...queryKeys.dashboard, 'statistics'] as const,
} as const

/**
 * Legacy query key factories for backward compatibility
 * These will be deprecated in favor of the centralized queryKeys factory
 * 
 * @deprecated Use queryKeys.auth and queryKeys.profile() instead
 */
export const authQueryKeys = {
  auth: queryKeys.auth,
  profile: queryKeys.profile,
}

/**
 * @deprecated Use queryKeys.customers, queryKeys.customersList(), and queryKeys.customer() instead
 */
export const customerKeys = {
  all: queryKeys.customers,
  lists: () => [...queryKeys.customers, 'list'] as const,
  list: (params: CustomerQueryParams) => queryKeys.customersList(params),
  details: () => [...queryKeys.customers, 'detail'] as const,
  detail: (id: string) => queryKeys.customer(id),
}

/**
 * @deprecated Use queryKeys.invoices, queryKeys.invoicesList(), and queryKeys.invoice() instead
 */
export const invoiceKeys = {
  all: queryKeys.invoices,
  lists: () => [...queryKeys.invoices, 'list'] as const,
  list: (params: InvoiceQueryParams) => queryKeys.invoicesList(params),
  details: () => [...queryKeys.invoices, 'detail'] as const,
  detail: (id: string) => queryKeys.invoice(id),
}

/**
 * @deprecated Use queryKeys.company and queryKeys.companyProfile() instead
 */
export const companyKeys = {
  all: queryKeys.company,
  profile: queryKeys.companyProfile,
}

/**
 * Utility functions for query key management
 */
export const queryKeyUtils = {
  /**
   * Get all query keys for a specific entity type
   */
  getEntityKeys: (entity: 'auth' | 'customers' | 'invoices' | 'company' | 'health') => {
    return queryKeys[entity]
  },

  /**
   * Check if a query key belongs to a specific entity
   */
  isEntityKey: (queryKey: readonly unknown[], entity: 'auth' | 'customers' | 'invoices' | 'company' | 'health') => {
    return queryKey[0] === entity
  },

  /**
   * Get all list query keys for customers
   */
  getAllCustomerListKeys: () => {
    return [...queryKeys.customers, 'list'] as const
  },

  /**
   * Get all list query keys for invoices
   */
  getAllInvoiceListKeys: () => {
    return [...queryKeys.invoices, 'list'] as const
  },

  /**
   * Get all detail query keys for customers
   */
  getAllCustomerDetailKeys: () => {
    return [...queryKeys.customers, 'detail'] as const
  },

  /**
   * Get all detail query keys for invoices
   */
  getAllInvoiceDetailKeys: () => {
    return [...queryKeys.invoices, 'detail'] as const
  },
}

/**
 * Type-safe query key patterns for advanced use cases
 */
export type QueryKeyPattern = 
  | typeof queryKeys.auth
  | ReturnType<typeof queryKeys.profile>
  | typeof queryKeys.customers
  | ReturnType<typeof queryKeys.customersList>
  | ReturnType<typeof queryKeys.customer>
  | typeof queryKeys.invoices
  | ReturnType<typeof queryKeys.invoicesList>
  | ReturnType<typeof queryKeys.invoice>
  | ReturnType<typeof queryKeys.invoicesByStatus>
  | ReturnType<typeof queryKeys.invoicesByCustomer>
  | ReturnType<typeof queryKeys.invoicesByDateRange>
  | typeof queryKeys.company
  | ReturnType<typeof queryKeys.companyProfile>
  | typeof queryKeys.health
  | ReturnType<typeof queryKeys.healthStatus>

/**
 * Query key validation utilities
 */
export const queryKeyValidation = {
  /**
   * Validate that a query key follows the expected pattern
   */
  isValidQueryKey: (queryKey: readonly unknown[]): queryKey is QueryKeyPattern => {
    if (!Array.isArray(queryKey) || queryKey.length === 0) {
      return false
    }

    const entity = queryKey[0]
    return ['auth', 'customers', 'invoices', 'company', 'health'].includes(entity as string)
  },

  /**
   * Get the entity type from a query key
   */
  getEntityFromKey: (queryKey: readonly unknown[]): string | null => {
    if (!queryKeyValidation.isValidQueryKey(queryKey)) {
      return null
    }
    return queryKey[0] as string
  },

  /**
   * Get the operation type from a query key (list, detail, etc.)
   */
  getOperationFromKey: (queryKey: readonly unknown[]): string | null => {
    if (!queryKeyValidation.isValidQueryKey(queryKey) || queryKey.length < 2) {
      return null
    }
    return queryKey[1] as string
  },
}