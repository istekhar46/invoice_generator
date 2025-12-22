# PDF Generation Service

This directory contains the PDF generation functionality for the Electrician Invoice Generation Web App.

## Overview

The PDF generation system uses `@react-pdf/renderer` to create professional, branded invoice PDFs that can be downloaded or previewed by users.

## Components

### 1. PDF Generator Service (`pdfGenerator.service.ts`)

The core service that handles PDF generation, download, and preview functionality.

**Key Features:**
- Generate PDF blobs from invoice data
- Download PDFs to user's device
- Preview PDFs in a new browser tab
- Error handling and validation

**Usage:**
```typescript
import { downloadInvoicePDF, previewInvoicePDF } from '@/services/pdf'

// Download PDF
await downloadInvoicePDF(invoice, company, customer)

// Preview PDF
await previewInvoicePDF(invoice, company, customer)
```

### 2. Invoice PDF Template (`InvoicePDFTemplate.tsx`)

React component that defines the PDF layout and styling using `@react-pdf/renderer`.

**Features:**
- Professional invoice layout
- Company branding with logo support
- Customer information display
- Line items table with proper formatting
- Totals calculation display
- Notes section
- Professional footer

**Styling:**
- Uses Roboto font family for professional typography
- Responsive layout optimized for A4 paper size
- Color scheme matching the application design
- Proper spacing and alignment

### 3. PDF Actions Component (`PDFActions.tsx`)

React component providing UI buttons for PDF operations.

**Features:**
- Download button with loading state
- Preview button with loading state
- Error handling
- Compact and default variants
- Disabled state when data is unavailable

**Usage:**
```typescript
import { PDFActions } from '@/components/features/invoices'

<PDFActions
  invoice={invoice}
  onError={(error) => console.error(error)}
/>
```

### 4. PDF Generation Hook (`usePDFGeneration.ts`)

Custom React hook that integrates PDF generation with Zustand stores.

**Features:**
- Automatic data fetching from stores
- Loading state management
- Error handling
- Validation of required data

**Usage:**
```typescript
import { usePDFGeneration } from '@/hooks/usePDFGeneration'

const { downloadPDF, previewPDF, isGenerating, error } = usePDFGeneration()

// Download by invoice ID
await downloadPDF('invoice-123')

// Preview by invoice ID
await previewPDF('invoice-123')
```

## Requirements Validation

This implementation satisfies the following requirements:

### Requirement 6.1: PDF Generation
✅ Generates formatted PDF documents on user request

### Requirement 6.2: Company Information
✅ Includes company logo (if uploaded), business information, and contact details

### Requirement 6.3: Customer Information
✅ Includes customer name, email, phone, and full address

### Requirement 6.4: Invoice Metadata
✅ Displays invoice number, service date, and due date

### Requirement 6.5: Line Items Table
✅ Shows all line items with descriptions, quantities, rates, and amounts

### Requirement 6.6: Totals Display
✅ Prominently displays subtotal, tax amount, and total

### Requirement 6.7: Notes Section
✅ Includes user-added notes in the PDF

### Requirement 6.8: Download Functionality
✅ Allows users to download the generated PDF file

## PDF Template Structure

The PDF template follows this structure:

```
┌─────────────────────────────────────────┐
│ Header                                  │
│ ┌─────────────┐  ┌──────────────────┐  │
│ │ Logo        │  │ INVOICE          │  │
│ │ Company Info│  │ #INV-2024-001    │  │
│ └─────────────┘  └──────────────────┘  │
├─────────────────────────────────────────┤
│ Customer & Invoice Details              │
│ ┌──────────────┐  ┌──────────────────┐ │
│ │ Bill To      │  │ Invoice Details  │ │
│ │ Customer Info│  │ Dates & Status   │ │
│ └──────────────┘  └──────────────────┘ │
├─────────────────────────────────────────┤
│ Line Items Table                        │
│ ┌─────────────────────────────────────┐ │
│ │ Description | Qty | Rate | Amount  │ │
│ │ Item 1      | 2   | $100 | $200    │ │
│ │ Item 2      | 1   | $50  | $50     │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Totals                                  │
│                    Subtotal:    $250.00 │
│                    Tax (8.0%):   $20.00 │
│                    Total:       $270.00 │
├─────────────────────────────────────────┤
│ Notes (if provided)                     │
│ Additional information...               │
├─────────────────────────────────────────┤
│ Footer                                  │
│ Thank you for your business!            │
└─────────────────────────────────────────┘
```

## Error Handling

The PDF generation system includes comprehensive error handling:

1. **Missing Company Profile**: Validates that company profile exists before generation
2. **Missing Customer**: Validates that customer information is available
3. **Empty Line Items**: Validates that invoice has at least one line item
4. **PDF Generation Failures**: Catches and reports PDF rendering errors
5. **Download/Preview Failures**: Handles browser API errors gracefully

## Testing

Unit tests are provided in `pdfGenerator.service.test.ts` to verify:
- PDF blob generation
- Download functionality
- Preview functionality
- Error handling

## Integration

To integrate PDF generation into your components:

1. **Using the Hook (Recommended):**
```typescript
import { usePDFGeneration } from '@/hooks/usePDFGeneration'

const MyComponent = () => {
  const { downloadPDF, isGenerating, error } = usePDFGeneration()
  
  return (
    <button onClick={() => downloadPDF(invoiceId)} disabled={isGenerating}>
      {isGenerating ? 'Generating...' : 'Download PDF'}
    </button>
  )
}
```

2. **Using the Component:**
```typescript
import { PDFActions } from '@/components/features/invoices'

const MyComponent = () => {
  return <PDFActions invoice={invoice} />
}
```

3. **Direct Service Usage:**
```typescript
import { downloadInvoicePDF } from '@/services/pdf'

const handleDownload = async () => {
  await downloadInvoicePDF(invoice, company, customer)
}
```

## Browser Compatibility

The PDF generation system works in all modern browsers that support:
- Blob API
- URL.createObjectURL
- File download via anchor tags
- window.open for preview

## Performance Considerations

- PDF generation is asynchronous and non-blocking
- Large invoices with many line items may take longer to generate
- Logo images are embedded as base64 data URLs
- Font loading is handled automatically by @react-pdf/renderer

## Future Enhancements

Potential improvements for future versions:
- Email PDF directly to customers
- Batch PDF generation for multiple invoices
- Custom PDF templates
- Additional export formats (Excel, CSV)
- PDF encryption and password protection