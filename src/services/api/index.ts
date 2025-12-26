// Export API client and related types
export { apiClient, ApiError } from './apiClient'
export type { ApiClient, RequestConfig } from './apiClient'

// Export authentication API
export { authApi, AuthApi } from './authApi'
export type { 
  LoginDto, 
  RegisterDto, 
  RefreshTokenDto, 
  UserResponseDto, 
  AuthResponseDto 
} from './authApi'

// Export customer API
export { customerApi, CustomerApi } from './customerApi'
export type {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerResponseDto,
  CustomerQueryParams,
  PaginatedCustomerResponse
} from './customerApi'

// Export invoice API
export { invoiceApi, InvoiceApi } from './invoiceApi'
export type {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  UpdateInvoiceStatusDto,
  CreateLineItemDto,
  InvoiceResponseDto,
  LineItemResponseDto,
  InvoiceQueryParams,
  PaginatedInvoiceResponse
} from './invoiceApi'

// Export company API
export { companyApi, CompanyApi } from './companyApi'
export type {
  CreateCompanyProfileDto,
  UpdateCompanyProfileDto,
  CompanyProfileResponseDto,
  UploadLogoResponse
} from './companyApi'

// Export dashboard API
export { dashboardApi, DashboardApi } from './dashboardApi'
export type { DashboardStatisticsDto } from './dashboardApi'

// Export token management
export { TokenManager } from '../auth/tokenManager'
export type { TokenPair } from '../auth/tokenManager'
// Export hooks
export { useRequestCancellation, useApiErrorHandler } from '../../hooks/useRequestCancellation'