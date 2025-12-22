# Requirements Document

## Introduction

This document specifies the requirements for an Electrician Invoice Generation Web Application. The system enables electricians to manage their business operations including company profile management, customer management, and invoice generation with PDF export capabilities. The application is a single-page React application using TypeScript, with local storage for data persistence.

## Glossary

- **System**: The Electrician Invoice Generation Web Application
- **User**: An electrician or electrical contractor using the application
- **Company_Profile**: Business information including name, contact details, and default rates
- **Customer**: A client for whom electrical services are provided
- **Invoice**: A billing document containing line items, calculations, and payment details
- **Line_Item**: An individual charge entry on an invoice (material or labor)
- **Local_Storage**: Browser-based persistent storage mechanism
- **PDF_Generator**: Component responsible for creating downloadable invoice PDFs

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to create an account and log in securely, so that I can access my business data privately.

#### Acceptance Criteria

1. WHEN a user provides valid email, password, and display name, THE System SHALL create a new user account
2. WHEN a user provides valid credentials, THE System SHALL authenticate the user and grant access
3. WHEN a user logs out, THE System SHALL clear the session and return to the login screen
4. IF a user provides invalid credentials, THEN THE System SHALL display an appropriate error message
5. THE System SHALL persist authentication state across browser sessions

### Requirement 2: Company Profile Management

**User Story:** As a user, I want to set up and manage my company profile, so that my business information appears on invoices.

#### Acceptance Criteria

1. WHEN a user creates a company profile, THE System SHALL store business name, address, contact information, and tax number
2. THE System SHALL allow users to set default labor rate and tax rate values
3. WHEN a user uploads a logo image, THE System SHALL store the logo for display on invoices
4. WHEN a user updates company profile information, THE System SHALL persist the changes to local storage
5. THE System SHALL validate that required fields (business name, email, phone) are not empty
6. THE System SHALL validate email format and phone number format

### Requirement 3: Customer Management

**User Story:** As a user, I want to add and manage customer information, so that I can quickly select customers when creating invoices.

#### Acceptance Criteria

1. WHEN a user creates a new customer, THE System SHALL store name, email, phone, and full address
2. WHEN a user views the customer list, THE System SHALL display all customers sorted by creation date
3. WHEN a user updates customer information, THE System SHALL persist changes to local storage
4. WHEN a user deletes a customer, THE System SHALL remove the customer from local storage
5. THE System SHALL validate that customer name is not empty
6. THE System SHALL validate email format and phone number format
7. THE System SHALL validate zip code format

### Requirement 4: Invoice Creation and Management

**User Story:** As a user, I want to create detailed invoices with multiple line items, so that I can bill customers accurately for materials and labor.

#### Acceptance Criteria

1. WHEN a user creates an invoice, THE System SHALL generate a unique invoice number
2. WHEN a user selects a customer, THE System SHALL populate customer details on the invoice
3. WHEN a user adds a line item, THE System SHALL allow specification of type (material or labor), description, quantity, and rate
4. WHEN a user adds or modifies line items, THE System SHALL automatically calculate the line item amount
5. THE System SHALL calculate subtotal as the sum of all line item amounts
6. THE System SHALL calculate tax amount by applying the tax rate to the subtotal
7. THE System SHALL calculate total as subtotal plus tax amount
8. WHEN a user saves an invoice, THE System SHALL persist it to local storage with status (draft, sent, or paid)
9. WHEN a user views the invoice list, THE System SHALL display all invoices sorted by creation date
10. WHEN a user updates an invoice, THE System SHALL persist changes to local storage
11. WHEN a user deletes an invoice, THE System SHALL remove it from local storage

### Requirement 5: Invoice Calculations

**User Story:** As a user, I want invoice totals to be calculated automatically, so that I can ensure accurate billing without manual math.

#### Acceptance Criteria

1. FOR ALL line items, THE System SHALL calculate amount as quantity multiplied by rate
2. FOR ALL invoices, THE System SHALL calculate subtotal as the sum of all line item amounts
3. FOR ALL invoices, THE System SHALL calculate tax amount as subtotal multiplied by tax rate
4. FOR ALL invoices, THE System SHALL calculate total as subtotal plus tax amount
5. WHEN any line item changes, THE System SHALL recalculate all dependent values immediately
6. THE System SHALL round all currency values to two decimal places

### Requirement 6: PDF Generation

**User Story:** As a user, I want to generate professional PDF invoices, so that I can send them to customers or print them.

#### Acceptance Criteria

1. WHEN a user requests a PDF for an invoice, THE System SHALL generate a formatted PDF document
2. THE PDF SHALL include company logo (if uploaded), company information, and contact details
3. THE PDF SHALL include customer information and full address
4. THE PDF SHALL include invoice number, service date, and due date
5. THE PDF SHALL include a table of all line items with descriptions, quantities, rates, and amounts
6. THE PDF SHALL include subtotal, tax amount, and total prominently displayed
7. THE PDF SHALL include any notes added by the user
8. WHEN PDF generation is complete, THE System SHALL allow the user to download the file

### Requirement 7: Data Persistence

**User Story:** As a user, I want my data to be saved automatically, so that I don't lose information if I close the browser.

#### Acceptance Criteria

1. WHEN a user creates or updates any entity, THE System SHALL persist the data to local storage immediately
2. WHEN a user reopens the application, THE System SHALL load all data from local storage
3. THE System SHALL serialize dates correctly for storage and deserialization
4. THE System SHALL maintain referential integrity between invoices and customers
5. IF local storage is unavailable, THEN THE System SHALL display an error message

### Requirement 8: User Interface and Navigation

**User Story:** As a user, I want an intuitive interface with clear navigation, so that I can efficiently manage my invoicing workflow.

#### Acceptance Criteria

1. THE System SHALL provide a dashboard showing recent invoices and key statistics
2. THE System SHALL provide navigation to customers, invoices, and settings pages
3. WHEN a user is not authenticated, THE System SHALL redirect to the login page
4. WHEN a user is authenticated, THE System SHALL prevent access to login/signup pages
5. THE System SHALL display loading indicators during asynchronous operations
6. THE System SHALL display error messages when operations fail
7. THE System SHALL provide responsive design that works on desktop and tablet devices

### Requirement 9: Form Validation

**User Story:** As a user, I want clear validation feedback on forms, so that I can correct errors before submitting data.

#### Acceptance Criteria

1. WHEN a user submits a form with invalid data, THE System SHALL display field-specific error messages
2. THE System SHALL validate email addresses match standard email format
3. THE System SHALL validate phone numbers match standard US phone format
4. THE System SHALL validate zip codes match standard US zip code format
5. THE System SHALL validate that required fields are not empty
6. THE System SHALL validate that numeric fields contain valid numbers
7. WHEN all validation passes, THE System SHALL enable form submission

### Requirement 10: Dashboard Statistics

**User Story:** As a user, I want to see key business metrics on my dashboard, so that I can track my business performance at a glance.

#### Acceptance Criteria

1. THE System SHALL display total number of invoices
2. THE System SHALL display total revenue from all paid invoices
3. THE System SHALL display number of pending (sent but not paid) invoices
4. THE System SHALL display a list of recent invoices with status indicators
5. WHEN invoice data changes, THE System SHALL update dashboard statistics immediately
