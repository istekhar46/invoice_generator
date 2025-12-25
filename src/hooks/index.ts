/**
 * Hooks Index
 * Exports all custom hooks
 */

export { usePDFGeneration } from './usePDFGeneration'
export { 
  useErrorHandler, 
  useAsyncOperation,
  type UseErrorHandlerOptions,
  type ErrorState,
  type UseAsyncOperationOptions,
} from './useErrorHandler'

// Authentication hooks
export {
  useUserProfile,
  useLogin,
  useRegister,
  useLogout,
  useRefreshToken,
  useAuthStatus,
  useGoogleLogin,
  authQueryKeys,
} from './useAuth'

// Customer hooks
export {
  useCustomers,
  useCustomer,
  useCustomerSearch,
  useAllCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  customerKeys,
} from './useCustomers'

// Invoice hooks
export {
  useInvoices,
  useInvoice,
  useInvoicesByStatus,
  useInvoicesByCustomer,
  useInvoicesByDateRange,
  useDraftInvoices,
  useSentInvoices,
  usePaidInvoices,
  useRecentInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useUpdateInvoiceStatus,
  useDeleteInvoice,
  invoiceKeys,
} from './useInvoices'

// Company profile hooks
export {
  useCompanyProfile,
  useCreateCompanyProfile,
  useUpdateCompanyProfile,
  useDeleteCompanyProfile,
  useUploadLogo,
  useCompanyProfileStatus,
  companyKeys,
} from './useCompany'

// Toast and notification hooks
export {
  useToast,
  useErrorHandler as useToastErrorHandler,
  ToastProvider,
} from './useToast'

// Prefetching hooks
export {
  usePrefetchOnHover,
  usePrefetchRelated,
  usePrefetchNextPage,
  useAutoPrefetch,
} from './usePrefetch'