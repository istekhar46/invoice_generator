import { apiClient } from './apiClient'

// Customer API DTOs based on backend structure
export interface CreateCustomerDto {
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
}

export interface UpdateCustomerDto {
  name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

export interface CustomerResponseDto {
  id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  createdAt: Date
  updatedAt: Date
}

export interface CustomerQueryParams {
  search?: string
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface PaginatedCustomerResponse {
  data: CustomerResponseDto[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Customer API service class
 * Handles all customer-related API operations
 */
export class CustomerApi {
  private readonly basePath = '/customers'

  /**
   * Get paginated list of customers with optional search and sorting
   */
  async getCustomers(params: CustomerQueryParams = {}): Promise<PaginatedCustomerResponse> {
    const queryParams = new URLSearchParams()
    
    if (params.search) queryParams.append('search', params.search)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())

    const url = queryParams.toString() 
      ? `${this.basePath}?${queryParams.toString()}`
      : this.basePath

    return apiClient.get<PaginatedCustomerResponse>(url)
  }

  /**
   * Get a single customer by ID
   */
  async getCustomer(id: string): Promise<CustomerResponseDto> {
    return apiClient.get<CustomerResponseDto>(`${this.basePath}/${id}`)
  }

  /**
   * Create a new customer
   */
  async createCustomer(data: CreateCustomerDto): Promise<CustomerResponseDto> {
    return apiClient.post<CustomerResponseDto>(this.basePath, data)
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(id: string, data: UpdateCustomerDto): Promise<CustomerResponseDto> {
    return apiClient.put<CustomerResponseDto>(`${this.basePath}/${id}`, data)
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/${id}`)
  }

  /**
   * Search customers by query string
   * Convenience method for search-only operations
   */
  async searchCustomers(query: string, params: Omit<CustomerQueryParams, 'search'> = {}): Promise<PaginatedCustomerResponse> {
    return this.getCustomers({ ...params, search: query })
  }
}

// Export singleton instance
export const customerApi = new CustomerApi()