# Implementation Plan: API Integration with TanStack Query

## Overview

This implementation plan converts the existing Zustand-based local storage system to a TanStack Query-based API integration. The approach focuses on incremental migration while maintaining existing UI components and user experience. Each task builds upon previous implementations to ensure a working system at every step.

## Tasks

- [x] 1. Install and configure TanStack Query foundation
  - Install @tanstack/react-query and related dependencies
  - Set up QueryClient with optimized configuration for business applications
  - Wrap application with QueryClientProvider
  - Configure React Query DevTools for development
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ]* 1.1 Write property test for retry policy configuration
  - **Property 18: Retry Mechanism**
  - **Validates: Requirements 1.4, 8.6**

- [x] 2. Create HTTP client service with authentication
  - [x] 2.1 Implement base HTTP client with axios or fetch
    - Create ApiClient class with standard HTTP methods
    - Configure base URL and default headers
    - _Requirements: 2.1_

  - [x] 2.2 Add authentication interceptors
    - Implement request interceptor for automatic token injection
    - Implement response interceptor for token refresh handling
    - Add automatic logout on authentication failures
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.3 Write property tests for HTTP client authentication
    - **Property 1: Authentication Token Inclusion**
    - **Property 2: Token Refresh on Expiration**
    - **Property 3: Logout on Token Refresh Failure**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 2.4 Add error handling and request cancellation
    - Implement error classification and handling
    - Add request cancellation support for component cleanup
    - _Requirements: 2.4, 2.6_

  - [ ]* 2.5 Write property tests for error handling and cancellation
    - **Property 4: HTTP Error Handling**
    - **Property 5: Request Cancellation on Unmount**
    - **Validates: Requirements 2.4, 2.6**

- [x] 3. Implement authentication API integration
  - [x] 3.1 Create authentication API service
    - Implement login, register, logout, and profile endpoints
    - Add token refresh functionality
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 3.2 Create authentication query hooks
    - Implement useLogin, useRegister, useLogout mutations
    - Implement useUserProfile query
    - Add token management and storage
    - _Requirements: 3.4, 3.6_

  - [ ]* 3.3 Write unit tests for authentication endpoints
    - Test login endpoint integration
    - Test register endpoint integration
    - Test logout endpoint integration
    - Test profile fetch after authentication
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [ ]* 3.4 Write property test for authentication state reactivity
    - **Property 6: Authentication State Reactivity**
    - **Validates: Requirements 3.6**

- [ ] 4. Checkpoint - Ensure authentication system works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement customer management API integration
  - [x] 5.1 Create customer API service
    - Implement CRUD operations for customers
    - Add pagination and search support
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.2 Create customer query hooks
    - Implement useCustomers query with pagination
    - Implement useCustomer query for individual customers
    - Add search and filtering capabilities
    - _Requirements: 4.5_

  - [ ]* 5.3 Write property test for customer search parameters
    - **Property 7: Search Parameter Transmission**
    - **Validates: Requirements 4.5**

  - [x] 5.4 Create customer mutation hooks
    - Implement useCreateCustomer, useUpdateCustomer, useDeleteCustomer
    - Add optimistic updates for better UX
    - Implement proper cache invalidation
    - _Requirements: 4.6, 7.2_

  - [ ]* 5.5 Write property tests for customer operations
    - **Property 8: Optimistic Updates**
    - **Property 9: Validation Error Display**
    - **Validates: Requirements 4.6, 4.7**

  - [ ]* 5.6 Write unit tests for customer endpoints
    - Test customer list endpoint with pagination
    - Test customer creation endpoint
    - Test customer update endpoint
    - Test customer deletion endpoint
    - Test cache invalidation for customer operations
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.2_

- [x] 6. Implement invoice management API integration
  - [x] 6.1 Create invoice API service
    - Implement CRUD operations for invoices
    - Add filtering by status, customer, and date range
    - Handle complex invoice data with line items
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.8_

  - [ ]* 6.2 Write property test for complex invoice data handling
    - **Property 10: Complex Data Handling**
    - **Validates: Requirements 5.8**

  - [x] 6.3 Create invoice query hooks
    - Implement useInvoices query with filtering
    - Implement useInvoice query for individual invoices
    - Add support for invoice filtering parameters
    - _Requirements: 5.6_

  - [ ]* 6.4 Write property test for invoice filtering
    - **Property 7: Search Parameter Transmission** (invoice filtering)
    - **Validates: Requirements 5.6**

  - [x] 6.5 Create invoice mutation hooks with optimistic updates
    - Implement useCreateInvoice, useUpdateInvoice, useDeleteInvoice
    - Implement useUpdateInvoiceStatus with optimistic updates
    - Add proper cache invalidation for invoice operations
    - _Requirements: 5.7, 7.3_

  - [ ]* 6.6 Write property test for invoice optimistic updates
    - **Property 8: Optimistic Updates** (invoice status changes)
    - **Validates: Requirements 5.7**

  - [ ]* 6.7 Write unit tests for invoice endpoints
    - Test invoice list endpoint with filtering
    - Test invoice creation endpoint
    - Test invoice update endpoint
    - Test invoice status update endpoint
    - Test invoice deletion endpoint
    - Test cache invalidation for invoice operations
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.3_

- [-] 7. Implement company profile API integration
  - [x] 7.1 Create company profile API service
    - Implement company profile CRUD operations
    - Add logo upload functionality with multipart form data
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.1.1 Fix backend file upload validation
    - Fix duplicate FileTypeValidator in company controller
    - Update FileTypeValidator to accept specific MIME types (image/jpeg, image/png, image/gif)
    - Test file upload with different image formats
    - Add DELETE /company/profile/logo endpoint for logo deletion
    - _Requirements: 6.4, 6.5_

  - [x] 7.2 Create company profile query hooks
    - Implement useCompanyProfile query
    - Implement company profile mutation hooks
    - Implement useUploadLogo mutation with progress tracking
    - Implement useDeleteLogo mutation for logo deletion
    - Update frontend UI for logo upload, update, and delete functionality
    - _Requirements: 6.5, 6.6, 7.4_

  - [ ]* 7.3 Write property test for file upload handling
    - **Property 11: File Upload Error Handling**
    - **Validates: Requirements 6.5**

  - [ ]* 7.4 Write unit tests for company profile endpoints
    - Test company profile fetch endpoint
    - Test company profile creation endpoint
    - Test company profile update endpoint
    - Test logo upload endpoint with multipart data
    - Test logo display after successful upload
    - Test cache invalidation for company profile operations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 7.4_

- [x] 8. Implement comprehensive cache management
  - [x] 8.1 Set up query key factory
    - Create consistent query key structure
    - Implement query key factory for all entities
    - _Requirements: 7.5_

  - [x] 8.2 Implement cache invalidation strategies
    - Add mutation success handlers for cache invalidation
    - Implement background refetch on window focus
    - _Requirements: 7.1, 7.6_

  - [ ]* 8.3 Write property tests for cache management
    - **Property 12: Cache Invalidation on Mutations**
    - **Property 13: Background Refetch on Focus**
    - **Property 19: Query Caching**
    - **Validates: Requirements 7.1, 7.6, 9.1**

- [-] 9. Implement UI integration and error handling
  - [x] 9.1 Update components to use query hooks
    - Replace Zustand store usage with TanStack Query hooks
    - Maintain existing component interfaces
    - _Requirements: 10.1, 10.4_

  - [x] 9.2 Add loading states and error handling
    - Implement loading indicators for all queries
    - Add error message display for failed operations
    - Add success notifications for mutations
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 9.3 Write property tests for UI feedback
    - **Property 14: Loading State Display**
    - **Property 15: Error Message Display**
    - **Property 16: Success Notification Display**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 9.3 Add offline support and retry mechanisms
    - Implement offline status indication
    - Add retry mechanisms for failed operations
    - _Requirements: 8.4, 8.6_

  - [ ]* 9.4 Write property tests for offline support
    - **Property 17: Offline Status Indication**
    - **Property 18: Retry Mechanism**
    - **Validates: Requirements 8.4, 8.6**

- [x] 10. Implement performance optimizations
  - [x] 10.1 Add pagination support
    - Implement pagination for customer and invoice lists
    - Add keepPreviousData for smooth pagination
    - _Requirements: 9.2_

  - [ ]* 10.2 Write property test for pagination
    - **Property 20: Pagination Parameter Transmission**
    - **Validates: Requirements 9.2**

  - [x] 10.3 Add data prefetching
    - Implement prefetching for related data
    - Add prefetching on hover for performance
    - _Requirements: 9.4_

  - [ ]* 10.4 Write property test for data prefetching
    - **Property 21: Related Data Prefetching**
    - **Validates: Requirements 9.4**

  - [x] 10.5 Optimize loading states and prevent layout shifts
    - Implement skeleton loading states
    - Add proper loading state management
    - _Requirements: 9.5_

  - [ ]* 10.6 Write property test for loading state optimization
    - **Property 14: Loading State Display** (layout shift prevention)
    - **Validates: Requirements 9.5**

- [x] 11. Migration and cleanup
  - [x] 11.1 Remove local storage dependencies
    - Remove Zustand stores for business data
    - Keep authentication token storage
    - Clean up unused local storage services
    - _Requirements: 10.2, 10.3_

  - [x] 11.2 Update routing and navigation
    - Ensure protected routes work with new authentication
    - Update navigation to handle loading states
    - _Requirements: 10.5_

  - [ ]* 11.3 Write integration tests for complete workflows
    - Test complete user authentication flow
    - Test complete customer management workflow
    - Test complete invoice management workflow
    - Test complete company profile management workflow
    - _Requirements: 10.5_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The migration maintains existing UI components while replacing data layer
- Authentication token management is preserved but integrated with server-side sessions