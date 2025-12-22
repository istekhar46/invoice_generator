# Implementation Plan: Invoice Backend API

## Overview

This implementation plan breaks down the NestJS backend API development into discrete, manageable tasks. Each task builds incrementally toward a complete backend system that replaces the localStorage-based frontend with a robust PostgreSQL-backed API. The implementation follows NestJS best practices with proper authentication, validation, and security measures.

## Tasks

- [x] 1. Project Setup and Configuration
  - Create `/backend` directory structure with NestJS CLI
  - Configure TypeScript, ESLint, and Prettier
  - Set up package.json with all required dependencies (NestJS, Prisma, PostgreSQL, JWT, Passport, etc.)
  - Configure environment variables for development and production
  - Set up Docker configuration for PostgreSQL database
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Database Schema and Prisma Setup
  - [x] 2.1 Initialize Prisma and configure PostgreSQL connection
    - Set up Prisma CLI and generate initial schema
    - Configure database connection strings
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Create complete Prisma schema with all models
    - Define User, CompanyProfile, Customer, Invoice, and LineItem models
    - Set up proper relationships and foreign key constraints
    - Add indexes for query optimization
    - Include timestamps and enums
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8_

  - [ ]* 2.3 Write property test for database referential integrity
    - **Property 1: Database referential integrity enforcement**
    - **Validates: Requirements 2.6**

  - [x] 2.4 Run database migrations and generate Prisma client
    - Execute initial migration to create database schema
    - Generate TypeScript types from Prisma schema
    - _Requirements: 2.9_

- [x] 3. Core Application Structure
  - [x] 3.1 Set up main application module and configuration
    - Create AppModule with global configuration
    - Set up ConfigModule for environment variables
    - Configure global pipes, filters, and interceptors
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 3.2 Create database module and Prisma service
    - Set up PrismaModule and PrismaService
    - Configure database connection pooling
    - Implement database error handling
    - _Requirements: 9.1, 9.3, 9.6_

  - [ ]* 3.3 Write property test for database error handling
    - **Property 18: Database error handling**
    - **Validates: Requirements 8.4, 9.6**

- [-] 4. Authentication System Implementation
  - [x] 4.1 Set up JWT authentication infrastructure
    - Install and configure @nestjs/jwt and @nestjs/passport
    - Create JWT strategy and authentication guard
    - Set up JWT token generation and validation
    - _Requirements: 3.1, 3.5, 3.7_

  - [x] 4.2 Write property test for JWT token consistency

    - **Property 2: JWT token generation and validation consistency**
    - **Validates: Requirements 3.1, 3.5**

  - [x] 4.3 Write property test for authentication guard protection

    - **Property 7: Authentication guard protection**
    - **Validates: Requirements 3.7**

  - [x] 4.4 Implement Google OAuth 2.0 integration
    - Set up passport-google-oauth20 strategy
    - Create Google OAuth controller and service methods
    - Handle user creation/update from Google profile
    - _Requirements: 3.2, 3.10_

  - [ ]* 4.5 Write property test for Google OAuth user management
    - **Property 3: Google OAuth user profile management**
    - **Validates: Requirements 3.2, 3.10**

  - [x] 4.6 Implement email/password authentication
    - Set up bcrypt for password hashing
    - Create registration and login endpoints
    - Implement email uniqueness validation
    - _Requirements: 3.3, 3.4, 3.9_

  - [x] 4.7 Write property test for email/password authentication

    - **Property 4: Email/password authentication round trip**
    - **Validates: Requirements 3.3**

  - [x] 4.8 Write property test for password hashing security

    - **Property 5: Password hashing security**
    - **Validates: Requirements 3.4**

  - [x] 4.9 Write property test for email uniqueness validation

    - **Property 9: Email uniqueness validation**
    - **Validates: Requirements 3.9**

  - [-] 4.10 Implement refresh token functionality
    - Create refresh token storage and validation
    - Implement token refresh endpoint
    - Handle token invalidation on logout
    - _Requirements: 3.6_

  - [x] 4.11 Write property test for refresh token functionality

    - **Property 6: Refresh token functionality**
    - **Validates: Requirements 3.6**

- [ ] 5. User Management Module
  - [ ] 5.1 Create User module with controller, service, and DTOs
    - Set up UserModule, UserController, and UserService
    - Create user DTOs for requests and responses
    - Implement user profile CRUD operations
    - _Requirements: 4.1, 4.2, 4.4_

  - [ ] 5.2 Implement password change functionality
    - Create password change endpoint with validation
    - Verify old password before updating
    - _Requirements: 4.3_

  - [ ]* 5.3 Write property test for user profile operations
    - **Property 10: User profile CRUD operations**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [ ] 5.4 Add input validation and error handling
    - Implement validation pipes for all user endpoints
    - Add proper error responses and HTTP status codes
    - _Requirements: 4.5, 4.6, 4.7_

- [ ] 6. Company Profile Module
  - [ ] 6.1 Create Company module with full CRUD operations
    - Set up CompanyModule, CompanyController, and CompanyService
    - Create company profile DTOs with validation
    - Implement create, read, update operations
    - Enforce one profile per user business rule
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

  - [ ]* 6.2 Write property test for company profile management
    - **Property 12: Company profile management**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.6**

  - [ ] 6.3 Implement file upload for company logos
    - Set up multer for file uploads
    - Add image validation (type, size)
    - Implement logo upload endpoint
    - _Requirements: 5.4, 5.7, 5.8_

  - [ ]* 6.4 Write property test for file upload validation
    - **Property 13: File upload validation and handling**
    - **Validates: Requirements 5.4, 5.7, 5.8, 8.7**

  - [ ] 6.5 Add business information validation
    - Implement comprehensive validation for all company fields
    - Add proper error handling for validation failures
    - _Requirements: 5.5_

- [ ] 7. Customer Management Module
  - [ ] 7.1 Create Customer module with full CRUD operations
    - Set up CustomerModule, CustomerController, and CustomerService
    - Create customer DTOs with validation
    - Implement create, read, update, delete operations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 7.2 Implement search and filtering functionality
    - Add search across customer name, email, phone, address
    - Implement sorting by name and creation date
    - Add pagination support
    - _Requirements: 6.6, 6.7_

  - [ ]* 7.3 Write property test for customer CRUD operations
    - **Property 14: Customer CRUD operations with search and pagination**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

  - [ ] 7.4 Implement data validation and user isolation
    - Add comprehensive customer data validation
    - Ensure customers are isolated by user ownership
    - _Requirements: 6.8, 6.9_

- [ ] 8. Invoice Management Module
  - [ ] 8.1 Create Invoice module with line items support
    - Set up InvoiceModule, InvoiceController, and InvoiceService
    - Create invoice and line item DTOs with validation
    - Implement invoice creation with automatic calculations
    - _Requirements: 7.1, 7.7_

  - [ ]* 8.2 Write property test for invoice calculations
    - **Property 15: Invoice CRUD operations with calculations**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**

  - [ ] 8.3 Implement invoice number generation
    - Create unique invoice number generation logic
    - Ensure uniqueness across the entire system
    - _Requirements: 7.8_

  - [ ]* 8.4 Write property test for invoice number uniqueness
    - **Property 16: Invoice number uniqueness**
    - **Validates: Requirements 7.8**

  - [ ] 8.5 Add invoice CRUD operations
    - Implement read, update, delete operations
    - Add invoice status update functionality
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ] 8.6 Implement filtering and pagination
    - Add filtering by status, customer, and date range
    - Implement sorting and pagination for invoice lists
    - _Requirements: 7.9, 7.10_

  - [ ]* 8.7 Write property test for invoice filtering
    - **Property 17: Invoice filtering and pagination**
    - **Validates: Requirements 7.9, 7.10**

  - [ ] 8.8 Add invoice validation and user isolation
    - Implement comprehensive invoice data validation
    - Ensure invoices are isolated by user ownership
    - _Requirements: 7.11, 7.12_

- [ ] 9. Security and Validation Implementation
  - [ ] 9.1 Set up global validation and error handling
    - Configure global validation pipe
    - Implement global exception filter
    - Add standardized error response format
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 9.2 Write property test for input validation consistency
    - **Property 11: Input validation consistency**
    - **Validates: Requirements 4.5, 4.6, 4.7, 5.5, 6.8, 7.11, 8.1, 8.2, 8.3**

  - [ ] 9.3 Implement security middleware
    - Set up Helmet for security headers
    - Configure CORS for frontend integration
    - Add rate limiting middleware
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 9.4 Write property test for security headers and rate limiting
    - **Property 23: Security headers and CORS configuration**
    - **Validates: Requirements 11.1, 11.2, 11.7, 11.8**

  - [ ]* 9.5 Write property test for rate limiting enforcement
    - **Property 19: Rate limiting enforcement**
    - **Validates: Requirements 8.6, 11.3**

  - [ ] 9.6 Add input sanitization and security validation
    - Implement input sanitization for XSS protection
    - Add SQL injection protection (via Prisma)
    - Configure secure cookie settings
    - _Requirements: 11.4, 11.5, 11.6, 11.8_

  - [ ]* 9.7 Write property test for security input sanitization
    - **Property 20: Security input sanitization**
    - **Validates: Requirements 8.8, 11.4, 11.5, 11.6**

- [ ] 10. Data Isolation and User Authorization
  - [ ] 10.1 Implement user data isolation across all modules
    - Add user context to all service methods
    - Ensure all queries filter by user ownership
    - Implement authorization guards for data access
    - _Requirements: 3.8, 6.9, 7.12_

  - [ ]* 10.2 Write property test for user data isolation
    - **Property 8: User data isolation**
    - **Validates: Requirements 3.8, 6.9, 7.12**

- [ ] 11. Database Transactions and Advanced Features
  - [ ] 11.1 Implement database transactions for complex operations
    - Add transaction support for invoice creation with line items
    - Implement transaction rollback on errors
    - _Requirements: 9.2_

  - [ ]* 11.2 Write property test for transaction integrity
    - **Property 21: Database transaction integrity**
    - **Validates: Requirements 9.2**

  - [ ] 11.3 Implement soft delete functionality
    - Add soft delete support for appropriate entities
    - Modify queries to exclude soft-deleted records
    - _Requirements: 9.7_

  - [ ]* 11.4 Write property test for soft delete implementation
    - **Property 22: Soft delete implementation**
    - **Validates: Requirements 9.7**

- [ ] 12. Health Checks and Monitoring
  - [ ] 12.1 Implement health check endpoints
    - Create health check controller
    - Add database connectivity checks
    - Include system status information
    - _Requirements: 12.8_

  - [ ]* 12.2 Write property test for health check availability
    - **Property 24: Health check endpoint availability**
    - **Validates: Requirements 12.8**

- [ ] 13. API Documentation
  - [ ] 13.1 Set up Swagger/OpenAPI documentation
    - Install and configure @nestjs/swagger
    - Add API documentation decorators to all endpoints
    - Generate comprehensive API documentation
    - _Requirements: 10.1_

- [ ] 14. Final Integration and Testing
  - [ ] 14.1 Integration testing setup
    - Set up test database configuration
    - Create integration tests for all API endpoints
    - Test authentication flows end-to-end
    - _Requirements: 10.2, 10.3, 10.4_

  - [ ] 14.2 Performance and security testing
    - Add performance tests for critical endpoints
    - Test all validation scenarios
    - Verify security measures are working
    - _Requirements: 10.5, 10.6_

- [ ] 15. Checkpoint - Complete Backend API
  - Ensure all tests pass, verify API documentation is complete
  - Test integration with existing frontend
  - Ask the user if questions arise about deployment or configuration

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check library
- Integration tests ensure end-to-end functionality
- The implementation follows NestJS best practices with proper separation of concerns
- Database operations use Prisma ORM for type safety and query optimization
- Security measures include authentication, authorization, input validation, and rate limiting