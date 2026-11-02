import type { CustomerResponseDto } from './customerApi'
import type { InvoiceOptions } from '../../types/entities'
import { apiClient } from './apiClient'

// Invoice API DTOs based on backend structure
export interface CreateLineItemDto {
  type: 'PRODUCT' | 'SERVICE'
  catalogItemId?: string | null
  description: string
  unit: string
  quantity: number
  rate: number
}

export interface CreateInvoiceDto extends InvoiceOptions {
  invoiceNumber?: string
  customerId: string
  serviceDate: Date
  dueDate: Date
  lineItems: CreateLineItemDto[]
  notes?: string
  taxRate: number
}

export interface CreateQuickInvoiceDto extends InvoiceOptions {
  invoiceNumber?: string
  isQuickInvoice: true
  clientRequestId?: string
  customerId?: string
  quickCompanyName?: string
  quickCompanyAddress?: string
  quickCompanyCity?: string
  quickCompanyState?: string
  quickCompanyZipCode?: string
  quickCompanyPhone?: string
  quickCompanyEmail?: string
  quickCompanyTaxNumber?: string
  quickCustomerName?: string
  quickCustomerEmail?: string
  quickCustomerPhone?: string
  quickCustomerAddress?: string
  quickCustomerCity?: string
  quickCustomerState?: string
  quickCustomerZipCode?: string
  serviceDate: Date
  dueDate: Date
  lineItems: CreateLineItemDto[]
  notes?: string
  taxRate: number
}

export type UpdateInvoiceDto = Partial<
  Omit<CreateQuickInvoiceDto, 'isQuickInvoice' | 'clientRequestId'>
>

export interface UpdateInvoiceStatusDto {
  status: 'DRAFT' | 'SENT' | 'PAID'
}

export interface LineItemResponseDto {
  id: string
  type: 'PRODUCT' | 'SERVICE'
  catalogItemId?: string | null
  description: string
  unit: string
  quantity: number
  rate: number
  amount: number
}

export interface InvoiceResponseDto extends InvoiceOptions {
  customerId?: string | null
  isQuickInvoice?: boolean
  quickCompanyName?: string | null
  quickCompanyAddress?: string | null
  quickCompanyCity?: string | null
  quickCompanyState?: string | null
  quickCompanyZipCode?: string | null
  quickCompanyPhone?: string | null
  quickCompanyEmail?: string | null
  quickCompanyTaxNumber?: string | null
  quickCustomerName?: string | null
  quickCustomerEmail?: string | null
  quickCustomerPhone?: string | null
  quickCustomerAddress?: string | null
  quickCustomerCity?: string | null
  quickCustomerState?: string | null
  quickCustomerZipCode?: string | null

  id: string
  invoiceNumber: string
  customer: CustomerResponseDto | null
  serviceDate: Date
  dueDate: Date
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  notes?: string
  status: 'DRAFT' | 'SENT' | 'PAID'
  lineItems: LineItemResponseDto[]
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceQueryParams {
  status?: 'DRAFT' | 'SENT' | 'PAID'
  customerId?: string
  dateFrom?: Date
  dateTo?: Date
  sortBy?: 'invoiceNumber' | 'createdAt' | 'serviceDate' | 'total'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface PaginatedInvoiceResponse {
  data: InvoiceResponseDto[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Invoice API service class
 * Handles all invoice-related API operations including CRUD operations,
 * filtering by status, customer, and date range, and complex invoice data with line items
 */
export class InvoiceApi {
  private readonly basePath = '/invoices'

  /**
   * Get paginated list of invoices with optional filtering and sorting
   * Supports filtering by status, customer, and date range
   */
  async getInvoices(
    params: InvoiceQueryParams = {}
  ): Promise<PaginatedInvoiceResponse> {
    const queryParams = new URLSearchParams()

    if (params.status) queryParams.append('status', params.status)
    if (params.customerId) queryParams.append('customerId', params.customerId)
    if (params.dateFrom)
      queryParams.append('dateFrom', params.dateFrom.toISOString())
    if (params.dateTo) queryParams.append('dateTo', params.dateTo.toISOString())
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())

    const url = queryParams.toString()
      ? `${this.basePath}?${queryParams.toString()}`
      : this.basePath

    return apiClient.get<PaginatedInvoiceResponse>(url)
  }

  /**
   * Get a single invoice by ID with complete line items data
   */
  async getInvoice(id: string): Promise<InvoiceResponseDto> {
    return apiClient.get<InvoiceResponseDto>(`${this.basePath}/${id}`)
  }

  /**
   * Create a new invoice with line items
   * Handles complex invoice data including line items and calculations
   */
  async createInvoice(data: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    return apiClient.post<InvoiceResponseDto>(this.basePath, data)
  }

  /**
   * Create a quick invoice with inline company and customer details
   * Allows creating invoices without saving company or customer details
   */
  async createQuickInvoice(
    data: CreateQuickInvoiceDto
  ): Promise<InvoiceResponseDto> {
    return apiClient.post<InvoiceResponseDto>(`${this.basePath}/quick`, data)
  }

  /**
   * Update an existing invoice
   * Supports partial updates of invoice data and line items
   * Transforms dates to ISO strings before sending to backend
   */
  async updateInvoice(
    id: string,
    data: UpdateInvoiceDto
  ): Promise<InvoiceResponseDto> {
    const transformedData = {
      ...data,
      ...(data.serviceDate !== undefined && {
        serviceDate: new Date(data.serviceDate).toISOString(),
      }),
      ...(data.dueDate !== undefined && {
        dueDate: new Date(data.dueDate).toISOString(),
      }),
    }

    // Send PUT request with transformed data
    const responseDto = await apiClient.put<InvoiceResponseDto>(
      `${this.basePath}/${id}`,
      transformedData
    )

    // Return the response DTO directly (caller can transform if needed)
    return responseDto
  }

  /**
   * Update invoice status (DRAFT -> SENT -> PAID)
   * Dedicated endpoint for status changes
   */
  async updateInvoiceStatus(
    id: string,
    status: 'DRAFT' | 'SENT' | 'PAID'
  ): Promise<InvoiceResponseDto> {
    return apiClient.patch<InvoiceResponseDto>(
      `${this.basePath}/${id}/status`,
      { status }
    )
  }

  /**
   * Delete an invoice
   * Returns void for successful deletion (204 No Content)
   */
  async deleteInvoice(id: string): Promise<void> {
    // DELETE returns 204 No Content (empty response)
    await apiClient.delete<void>(`${this.basePath}/${id}`)
    // No return value needed for 204 responses - apiClient handles this
  }

  /**
   * Filter invoices by status
   * Convenience method for status-only filtering
   */
  async getInvoicesByStatus(
    status: 'DRAFT' | 'SENT' | 'PAID',
    params: Omit<InvoiceQueryParams, 'status'> = {}
  ): Promise<PaginatedInvoiceResponse> {
    return this.getInvoices({ ...params, status })
  }

  /**
   * Filter invoices by customer
   * Convenience method for customer-specific invoices
   */
  async getInvoicesByCustomer(
    customerId: string,
    params: Omit<InvoiceQueryParams, 'customerId'> = {}
  ): Promise<PaginatedInvoiceResponse> {
    return this.getInvoices({ ...params, customerId })
  }

  /**
   * Filter invoices by date range
   * Convenience method for date range filtering
   */
  async getInvoicesByDateRange(
    dateFrom: Date,
    dateTo: Date,
    params: Omit<InvoiceQueryParams, 'dateFrom' | 'dateTo'> = {}
  ): Promise<PaginatedInvoiceResponse> {
    return this.getInvoices({ ...params, dateFrom, dateTo })
  }
}

// Export singleton instance
export const invoiceApi = new InvoiceApi()
