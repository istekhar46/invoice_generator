# Quick Invoice Generator Feature

## Overview
A new feature that allows users to create invoices without needing to save company or customer details. The company and customer information is stored directly on the invoice record.

## Changes Made

### Backend Changes

#### 1. Database Schema (`backend/prisma/schema.prisma`)
- Added optional fields to the `Invoice` model for quick invoice support:
  - `isQuickInvoice: Boolean` - Flag to identify quick invoices
  - `customerId: String?` - Made optional for quick invoices
  - Inline company details (quickCompanyName, quickCompanyAddress, etc.)
  - Inline customer details (quickCustomerName, quickCustomerEmail, etc.)

#### 2. New DTO (`backend/src/invoice/dto/create-quick-invoice.dto.ts`)
- Created `CreateQuickInvoiceDto` with all inline company and customer fields
- All inline fields are optional except for basic invoice requirements

#### 3. Invoice Service (`backend/src/invoice/invoice.service.ts`)
- Added `createQuick()` method to handle quick invoice creation
- Validates user existence and optional customer ownership
- Creates invoice with inline company and customer details

#### 4. Invoice Controller (`backend/src/invoice/invoice.controller.ts`)
- Added `POST /invoices/quick` endpoint for creating quick invoices
- Returns `InvoiceResponseDto` with the created invoice data

### Frontend Changes

#### 1. Types (`src/types/entities.ts`)
- Updated `Invoice` interface to include:
  - Optional `customerId` (was required)
  - Quick invoice flags and inline details

#### 2. Form Types (`src/types/forms.ts`)
- Added `quickInvoiceSchema` with validation for quick invoice form data
- Validates that either customer ID or quick customer details are provided

#### 3. API Layer (`src/services/api/invoiceApi.ts`)
- Added `CreateQuickInvoiceDto` interface
- Added `createQuickInvoice()` method to `InvoiceApi` class
- Posts to `/invoices/quick` endpoint

#### 4. Hooks (`src/hooks/useInvoices.ts`)
- Added `useCreateQuickInvoice()` hook
- Includes optimistic updates and cache invalidation

#### 5. Components
- **QuickInvoiceBuilder** (`src/components/features/invoices/QuickInvoiceBuilder.tsx`)
  - Multi-step form wizard (Company → Customer → Details → Items → Review)
  - Step 1: Optional company details
  - Step 2: Required customer details
  - Step 3: Invoice dates and tax rate
  - Step 4: Line items management
  - Step 5: Review and save

- **QuickInvoicePage** (`src/pages/QuickInvoicePage.tsx`)
  - Main page component for quick invoice generation
  - Shows invoice preview after successful creation

#### 6. Navigation
- Added "Quick Invoice" route (`/quick-invoice`)
- Added "Quick Invoice" navigation item in Header with Zap icon
- Added to route metadata for breadcrumbs

## User Flow

1. User clicks "Quick Invoice" in the navigation menu
2. User is presented with a multi-step form wizard:
   - **Step 1 (Optional)**: Enter company details or skip
   - **Step 2 (Required)**: Enter customer information
   - **Step 3 (Required)**: Set service date, due date, and tax rate
   - **Step 4 (Required)**: Add line items (materials and/or labor)
   - **Step 5**: Review and save
3. On save, the invoice is created with inline company/customer details
4. User sees the invoice preview
5. The invoice appears in the regular invoices list

## Key Features

- **No Data Persistence**: Company and customer details are NOT saved to the company_profiles or customers tables
- **Optional Company Step**: Users can skip entering company details
- **Flexible Customer Entry**: Users can either select a saved customer or enter details inline
- **Same Invoice Structure**: Quick invoices use the same line items and calculations as regular invoices
- **Full Preview**: Generated invoices can be previewed and converted to PDF like regular invoices

## Database Migration Required

To apply the schema changes, run:
```bash
cd backend
npx prisma migrate dev --name add_quick_invoice_fields
```

## Future Enhancements

- Option to convert quick invoice customer to saved customer
- Option to save quick invoice company as company profile
- Template system for frequently used quick invoice details
- Bulk quick invoice creation
