# Requirements Document

## Introduction

This specification addresses issues with the invoice update and delete operations in the electrician invoice application. While create and list operations work correctly, update and delete operations are not functioning as expected. This document defines requirements to diagnose and fix these issues across the full stack (backend API, frontend API client, React hooks, and UI components).

## Glossary

- **Invoice_System**: The complete invoice management system including backend API and frontend application
- **Backend_API**: The NestJS backend service that handles invoice CRUD operations
- **Frontend_Client**: The React frontend application that consumes the Backend_API
- **API_Client**: The TypeScript service layer that makes HTTP requests to the Backend_API
- **React_Hooks**: Custom hooks that manage invoice state and mutations using TanStack Query
- **DTO**: Data Transfer Object used for API request/response validation
- **Line_Item**: Individual charge entry (material or labor) within an invoice
- **Invoice_Status**: The current state of an invoice (DRAFT, SENT, or PAID)

## Requirements

### Requirement 1: Diagnose Update Operation Issues

**User Story:** As a developer, I want to identify why invoice updates are failing, so that I can fix the root cause and enable users to edit invoices successfully.

#### Acceptance Criteria

1. WHEN analyzing the update endpoint, THE Invoice_System SHALL verify that the PUT /invoices/:id endpoint accepts partial updates correctly
2. WHEN examining data transformation, THE Invoice_System SHALL ensure date fields are properly serialized between frontend and backend
3. WHEN reviewing the update mutation, THE Invoice_System SHALL confirm that the React hook properly handles the update response
4. WHEN testing line item updates, THE Invoice_System SHALL verify that line items are correctly replaced during updates
5. WHEN checking error handling, THE Invoice_System SHALL ensure validation errors are properly surfaced to the user

### Requirement 2: Fix Update Operation Data Flow

**User Story:** As a user, I want to edit existing invoices, so that I can correct mistakes or update invoice details before sending them to customers.

#### Acceptance Criteria

1. WHEN a user submits an invoice update, THE Frontend_Client SHALL transform dates to ISO 8601 format before sending to the API
2. WHEN the Backend_API receives an update request, THE Backend_API SHALL validate all fields according to the UpdateInvoiceDto schema
3. WHEN updating line items, THE Backend_API SHALL delete existing line items and create new ones within a transaction
4. WHEN the update succeeds, THE React_Hooks SHALL update the query cache with the new invoice data
5. WHEN the update fails, THE React_Hooks SHALL rollback optimistic updates and display the error message to the user

### Requirement 3: Diagnose Delete Operation Issues

**User Story:** As a developer, I want to identify why invoice deletions are failing, so that I can fix the root cause and enable users to remove invoices successfully.

#### Acceptance Criteria

1. WHEN analyzing the delete endpoint, THE Invoice_System SHALL verify that the DELETE /invoices/:id endpoint returns 204 No Content on success
2. WHEN examining the API client, THE Invoice_System SHALL ensure the delete method properly handles 204 responses
3. WHEN reviewing the delete mutation, THE Invoice_System SHALL confirm that the React hook properly invalidates the cache after deletion
4. WHEN testing cascade deletion, THE Invoice_System SHALL verify that line items are automatically deleted with the invoice
5. WHEN checking authorization, THE Invoice_System SHALL ensure users can only delete their own invoices

### Requirement 4: Fix Delete Operation Data Flow

**User Story:** As a user, I want to delete draft invoices that I no longer need, so that I can keep my invoice list clean and organized.

#### Acceptance Criteria

1. WHEN a user confirms invoice deletion, THE Frontend_Client SHALL send a DELETE request to the correct endpoint
2. WHEN the Backend_API receives a delete request, THE Backend_API SHALL verify invoice ownership before deletion
3. WHEN the deletion succeeds, THE Backend_API SHALL return 204 No Content with no response body
4. WHEN the API_Client receives a 204 response, THE API_Client SHALL resolve the promise successfully
5. WHEN the delete mutation succeeds, THE React_Hooks SHALL remove the invoice from all query caches and invalidate related queries

### Requirement 5: Validate Data Transformation

**User Story:** As a developer, I want to ensure data is correctly transformed between frontend and backend, so that API requests succeed and data integrity is maintained.

#### Acceptance Criteria

1. WHEN transforming invoice data for updates, THE Frontend_Client SHALL convert Date objects to ISO 8601 strings
2. WHEN transforming line item types, THE Frontend_Client SHALL ensure enum values match backend expectations (MATERIAL, LABOR)
3. WHEN receiving invoice responses, THE Frontend_Client SHALL parse ISO 8601 date strings back to Date objects
4. WHEN handling nested customer data, THE Frontend_Client SHALL properly extract customer information from API responses
5. WHEN serializing optional fields, THE Frontend_Client SHALL omit undefined values or send null as appropriate

### Requirement 6: Improve Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when operations fail, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN an update fails due to validation errors, THE Frontend_Client SHALL display specific field-level error messages
2. WHEN an update fails due to network errors, THE Frontend_Client SHALL display a retry option
3. WHEN a delete fails due to authorization, THE Frontend_Client SHALL display an appropriate access denied message
4. WHEN a delete fails due to network errors, THE Frontend_Client SHALL allow the user to retry the operation
5. WHEN operations succeed, THE Frontend_Client SHALL display success notifications with relevant invoice details

### Requirement 7: Ensure Cache Consistency

**User Story:** As a user, I want the UI to immediately reflect changes after updating or deleting invoices, so that I see accurate data without manual refreshes.

#### Acceptance Criteria

1. WHEN an invoice is updated, THE React_Hooks SHALL optimistically update the cache before the API responds
2. WHEN an update fails, THE React_Hooks SHALL rollback the optimistic update and restore previous data
3. WHEN an invoice is deleted, THE React_Hooks SHALL optimistically remove it from all list queries
4. WHEN a deletion fails, THE React_Hooks SHALL restore the invoice to all affected caches
5. WHEN mutations complete, THE React_Hooks SHALL invalidate related queries (dashboard statistics, customer invoices)

### Requirement 8: Test Update and Delete Operations

**User Story:** As a developer, I want comprehensive tests for update and delete operations, so that I can prevent regressions and ensure reliability.

#### Acceptance Criteria

1. WHEN testing the update endpoint, THE Backend_API SHALL verify that partial updates work correctly
2. WHEN testing the delete endpoint, THE Backend_API SHALL verify that cascade deletion removes line items
3. WHEN testing the API client, THE Frontend_Client SHALL verify that 204 responses are handled correctly
4. WHEN testing React hooks, THE Frontend_Client SHALL verify that optimistic updates and rollbacks work correctly
5. WHEN testing the UI, THE Frontend_Client SHALL verify that success and error states are displayed appropriately

### Requirement 9: Document API Contract

**User Story:** As a developer, I want clear documentation of the update and delete API contracts, so that I can correctly implement and maintain the frontend integration.

#### Acceptance Criteria

1. WHEN documenting the update endpoint, THE Backend_API SHALL specify which fields are required vs optional
2. WHEN documenting date fields, THE Backend_API SHALL specify the expected format (ISO 8601)
3. WHEN documenting the delete endpoint, THE Backend_API SHALL specify the expected response (204 No Content)
4. WHEN documenting error responses, THE Backend_API SHALL provide examples of validation and authorization errors
5. WHEN documenting line item updates, THE Backend_API SHALL clarify that the entire line items array is replaced

