# Implementation Plan: Invoice CRUD Fix

## Overview

This implementation plan addresses critical issues with invoice update and delete operations. The approach focuses on systematic diagnosis, fixing data transformation issues, improving error handling, and ensuring cache consistency. Tasks are organized to validate and fix issues incrementally, with testing integrated throughout.

## Tasks

- [x] 1. Diagnose and document current issues
  - Analyze network requests for update and delete operations
  - Document exact error messages and failure points
  - Identify data transformation mismatches
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Fix data transformation layer
  - [x] 2.1 Create/update date transformation functions in apiTransformers.ts
    - Implement `transformInvoiceToUpdateDto` to serialize dates to ISO 8601
    - Implement `transformInvoiceResponse` to deserialize ISO strings to Date objects
    - Ensure millisecond precision is maintained
    - _Requirements: 1.2, 2.1, 5.1, 5.3_

  - [ ]* 2.2 Write property test for date round-trip consistency
    - **Property 2: Date Round-Trip Consistency**
    - **Validates: Requirements 1.2, 2.1, 5.1, 5.3**

  - [x] 2.3 Create/update enum transformation functions
    - Implement `transformLineItemToDto` to convert lowercase to uppercase enums
    - Handle both 'material'/'labor' and 'MATERIAL'/'LABOR' inputs
    - _Requirements: 5.2_

  - [ ]* 2.4 Write property test for enum case transformation
    - **Property 11: Enum Case Transformation**
    - **Validates: Requirements 5.2**

  - [x] 2.5 Implement optional field handling
    - Ensure undefined values are omitted from API requests
    - Handle null values appropriately
    - _Requirements: 5.5_

  - [ ]* 2.6 Write property test for optional field handling
    - **Property 13: Optional Field Handling**
    - **Validates: Requirements 5.5**

- [x] 3. Fix API client layer
  - [x] 3.1 Update invoiceApi.updateInvoice method
    - Apply data transformations before sending request
    - Ensure proper error handling
    - _Requirements: 2.1, 5.1_

  - [x] 3.2 Update invoiceApi.deleteInvoice method
    - Ensure 204 No Content responses are handled correctly
    - Return void (no data) for successful deletes
    - _Requirements: 3.1, 3.2, 4.3, 4.4_

  - [ ]* 3.3 Write example test for 204 response handling
    - **Example Test 1: 204 No Content Response Handling**
    - **Validates: Requirements 3.1, 3.2, 4.3, 4.4**

  - [x] 3.4 Update apiClient response interceptor
    - Handle 204 status codes explicitly
    - Improve error message formatting
    - _Requirements: 3.2, 4.4_

  - [x] 3.5 Add customer data extraction helper
    - Extract nested customer data from API responses
    - Transform to frontend Customer type
    - _Requirements: 5.4_

  - [ ] 3.6 Write property test for customer data extraction

    - **Property 12: Customer Data Extraction**
    - **Validates: Requirements 5.4**

- [x] 4. Checkpoint - Verify data transformation
  - Test date serialization/deserialization manually
  - Test enum transformation manually
  - Test 204 response handling manually
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Fix React hooks layer
  - [x] 5.1 Update useUpdateInvoice hook
    - Implement optimistic cache updates in onMutate
    - Implement rollback in onError
    - Add proper cache invalidation in onSettled
    - Improve error messages based on error status
    - _Requirements: 1.3, 2.4, 2.5, 7.1, 7.2_

  - [ ]* 5.2 Write property test for optimistic update with rollback
    - **Property 6: Optimistic Update with Rollback**
    - **Validates: Requirements 2.5, 7.1, 7.2**

  - [ ]* 5.3 Write property test for update response cache synchronization
    - **Property 3: Update Response Cache Synchronization**
    - **Validates: Requirements 1.3, 2.4**

  - [x] 5.4 Update useDeleteInvoice hook
    - Implement optimistic removal from cache in onMutate
    - Implement rollback in onError
    - Add comprehensive cache invalidation in onSettled
    - Improve error messages based on error status
    - _Requirements: 3.3, 4.5, 7.3, 7.4, 7.5_

  - [ ]* 5.5 Write property test for cache removal on delete
    - **Property 9: Cache Removal on Delete**
    - **Validates: Requirements 3.3, 4.5, 7.3, 7.5**

  - [ ]* 5.6 Write property test for delete rollback on failure
    - **Property 10: Delete Rollback on Failure**
    - **Validates: Requirements 7.4**

  - [x] 5.7 Add offline status checks
    - Check isOnline before mutations
    - Display appropriate offline error messages
    - _Requirements: 6.2, 6.4_

  - [ ]* 5.8 Write property test for success notification display
    - **Property 14: Success Notification Display**
    - **Validates: Requirements 6.5**

- [x] 6. Fix backend service layer
  - [x] 6.1 Review and enhance InvoiceService.update method
    - Ensure partial updates work correctly
    - Validate date logic (due date >= service date)
    - Ensure transaction atomicity for line items
    - Add detailed error logging
    - _Requirements: 1.1, 1.4, 2.2, 2.3, 10.1, 10.2_

  - [ ]* 6.2 Write property test for partial update acceptance
    - **Property 1: Partial Update Acceptance**
    - **Validates: Requirements 1.1**

  - [ ]* 6.3 Write property test for line items atomic replacement
    - **Property 4: Line Items Atomic Replacement**
    - **Validates: Requirements 1.4, 2.3**

  - [x] 6.4 Review and enhance InvoiceService.delete method
    - Ensure ownership validation before deletion
    - Verify cascade deletion of line items
    - Add detailed error logging
    - _Requirements: 3.4, 3.5, 4.2, 10.3, 10.4_

  - [ ]* 6.5 Write property test for cascade deletion
    - **Property 7: Cascade Deletion of Line Items**
    - **Validates: Requirements 3.4**

  - [ ]* 6.6 Write property test for authorization on delete
    - **Property 8: Authorization on Delete**
    - **Validates: Requirements 3.5, 4.2**

  - [x] 6.7 Enhance validation error responses
    - Return field-level validation errors
    - Include helpful error messages
    - _Requirements: 1.5, 2.2, 6.1_

  - [ ]* 6.8 Write property test for validation error surfacing
    - **Property 5: Validation Error Surfacing**
    - **Validates: Requirements 1.5, 2.2, 6.1**

- [x] 7. Checkpoint - Verify backend fixes
  - Test partial updates via API
  - Test cascade deletion via API
  - Test authorization checks via API
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update UI components
  - [x] 8.1 Update InvoiceBuilder component
    - Apply data transformations before submitting
    - Improve error display for validation errors
    - Add loading states during mutations
    - _Requirements: 2.1, 6.1, 6.2_

  - [x] 8.2 Update InvoiceList component
    - Ensure delete confirmation works correctly
    - Display appropriate error messages
    - Handle loading states during deletion
    - _Requirements: 4.1, 6.3, 6.4_

  - [ ]* 8.3 Write example test for authorization error message
    - **Example Test 2: Authorization Error Message**
    - **Validates: Requirements 6.3**

- [ ] 9. Add comprehensive logging
  - [ ] 9.1 Add backend logging for update operations
    - Log invoice ID and updated fields on request
    - Log validation errors and database errors
    - _Requirements: 10.1, 10.2_

  - [ ] 9.2 Add backend logging for delete operations
    - Log invoice ID and user ID on request
    - Log failure reasons (not found, unauthorized, etc.)
    - _Requirements: 10.3, 10.4_

  - [ ] 9.3 Add frontend logging for failed operations
    - Log error details to console for debugging
    - Include request payload and response
    - _Requirements: 10.5_

- [ ] 10. Integration testing
  - [ ]* 10.1 Write E2E test for update flow
    - Test complete update flow from UI to database
    - Verify data transformations work end-to-end
    - Verify cache updates correctly
    - _Requirements: 8.1, 8.4, 8.5_

  - [ ]* 10.2 Write E2E test for delete flow
    - Test complete delete flow from UI to database
    - Verify cascade deletion works
    - Verify cache invalidation works
    - _Requirements: 8.2, 8.4, 8.5_

  - [ ]* 10.3 Write E2E test for error scenarios
    - Test validation errors display correctly
    - Test authorization errors display correctly
    - Test network errors are handled gracefully
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 11. Final checkpoint and documentation
  - Run all tests (unit, property, integration)
  - Verify update and delete work in development environment
  - Update API documentation with correct request/response formats
  - Document common issues and troubleshooting steps
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Focus on fixing data transformation issues first, then cache management, then UI polish
