# PDF Generation Integration Test

## Manual Testing Steps

To verify the PDF generation functionality is working correctly, follow these steps:

### Prerequisites
1. Ensure the application is running (`npm run dev`)
2. Set up a company profile with business information
3. Create at least one customer
4. Create an invoice with line items

### Test Cases

#### 1. PDF Download Test
1. Navigate to an invoice
2. Click the "Download PDF" button
3. Verify that a PDF file is downloaded to your device
4. Open the PDF and verify it contains:
   - Company information and logo (if uploaded)
   - Customer information
   - Invoice number, dates, and status
   - Line items table with descriptions, quantities, rates, and amounts
   - Subtotal, tax, and total calculations
   - Notes (if provided)
   - Professional formatting and styling

#### 2. PDF Preview Test
1. Navigate to an invoice
2. Click the "Preview PDF" button
3. Verify that a new browser tab opens with the PDF
4. Verify the PDF content matches the download test requirements

#### 3. Error Handling Test
1. Try to generate a PDF without setting up company profile
2. Verify appropriate error message is displayed
3. Try to generate a PDF for an invoice without line items
4. Verify appropriate error message is displayed

#### 4. Loading States Test
1. Click PDF generation buttons
2. Verify loading indicators are shown during generation
3. Verify buttons are disabled during generation

### Expected Results

✅ PDF files should be generated successfully
✅ PDF content should match invoice data exactly
✅ Professional formatting and styling should be applied
✅ Error messages should be clear and helpful
✅ Loading states should provide good user feedback

### Integration Points

The PDF generation system integrates with:
- **Invoice Store**: Retrieves invoice data
- **Company Store**: Retrieves company profile and logo
- **Customer Store**: Retrieves customer information
- **UI Components**: Provides PDF action buttons
- **Error Handling**: Displays user-friendly error messages

### Browser Compatibility

Tested and working in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance Notes

- PDF generation typically takes 1-3 seconds
- Large invoices with many line items may take longer
- Logo images are embedded as base64 data
- Font loading is handled automatically

### Troubleshooting

If PDF generation fails:
1. Check browser console for error messages
2. Verify company profile is set up
3. Verify customer exists for the invoice
4. Verify invoice has at least one line item
5. Check network connectivity for font loading