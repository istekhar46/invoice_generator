# PDF Generation Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "Buffer is not defined" Error

**Problem:** @react-pdf/renderer tries to use Node.js Buffer API which isn't available in browsers.

**Solution:** 
- Updated `vite.config.ts` to define `global: 'globalThis'`
- Switched to built-in Helvetica font instead of loading external fonts
- This avoids the Buffer dependency that comes with font loading

### Issue 2: "Company profile is required" Error

**Problem:** PDF generation requires a company profile to be set up first.

**Solution:**
- Enhanced error messages to guide users to Settings → Company Profile
- Added validation in `usePDFGeneration.ts` to check for required data
- Display helpful error messages with next steps

**User Action Required:**
1. Go to Settings in the navigation menu
2. Click on "Company Profile"
3. Fill in all required business information
4. Save the profile
5. Return to invoices and try PDF generation again

### Issue 3: Font Loading Errors (DataView/TTFSubset errors)

**Problem:** External font loading from CDN causes browser compatibility issues.

**Solution:**
- Removed custom Roboto font registration
- Using built-in Helvetica font family instead
- This provides consistent rendering across all browsers without external dependencies

**Available Built-in Fonts:**
- Helvetica (default)
- Helvetica-Bold
- Helvetica-Oblique
- Times-Roman
- Courier

### Issue 4: Logo Loading Issues

**Problem:** Company logos stored as base64 data URLs may fail to load in PDFs.

**Solution:**
- Wrapped logo in a View container with proper styling
- Added fallback handling for missing logos
- Logo is optional - PDF will generate without it

## Testing PDF Generation

### Method 1: Use the Test Component

A test component is available at `src/components/features/invoices/PDFTestComponent.tsx` that:
- Uses sample data (no company profile required)
- Tests core PDF functionality
- Helps identify issues quickly

### Method 2: Use Real Data

1. Set up your company profile in Settings
2. Create a customer
3. Create an invoice with line items
4. Click the three dots (⋮) in the invoice list
5. Select "Preview PDF" or "Download PDF"

## Error Messages Explained

### "Company profile is required to generate PDF"
- **Cause:** No company profile has been created
- **Fix:** Go to Settings → Company Profile and fill in your business information

### "Customer information not found"
- **Cause:** The customer associated with the invoice no longer exists
- **Fix:** Ensure the customer exists before generating PDF

### "Invoice must have at least one line item"
- **Cause:** The invoice has no line items
- **Fix:** Add at least one line item to the invoice

### "Failed to generate PDF. Please try again."
- **Cause:** General PDF generation error (font loading, rendering, etc.)
- **Fix:** Check browser console for detailed error, try refreshing the page

## Browser Compatibility

### Supported Browsers:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Known Issues:
- Internet Explorer: Not supported (use modern browser)
- Older browsers: May have issues with PDF rendering

## Performance Tips

1. **Keep invoices reasonable size:**
   - Limit line items to 50 or fewer for best performance
   - Large invoices may take 3-5 seconds to generate

2. **Logo optimization:**
   - Use compressed images (< 500KB)
   - Recommended size: 200x200 pixels
   - Supported formats: PNG, JPEG

3. **Browser resources:**
   - Close unnecessary tabs
   - Clear browser cache if PDFs fail repeatedly
   - Ensure sufficient memory available

## Development Notes

### Font Configuration

The PDF template now uses built-in fonts to avoid external dependencies:

```typescript
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', // Built-in font
    fontSize: 10,
    // ...
  },
})
```

### Vite Configuration

Added global polyfill for @react-pdf/renderer:

```typescript
export default defineConfig({
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@react-pdf/renderer'],
  },
})
```

### Error Handling

Enhanced error handling in `usePDFGeneration.ts`:

```typescript
const validatePDFData = useCallback((invoice: Invoice) => {
  if (!companyProfile) {
    throw new Error('Company profile is required...')
  }
  // Additional validation...
}, [companyProfile, getCustomer])
```

## Getting Help

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Verify all required data is present (company profile, customer, line items)
3. Try the PDF test component to isolate the issue
4. Clear browser cache and try again
5. Try a different browser to rule out browser-specific issues

## Future Improvements

Potential enhancements for future versions:

- [ ] Add support for custom fonts (with proper polyfills)
- [ ] Implement PDF caching for faster regeneration
- [ ] Add PDF email functionality
- [ ] Support for multiple page invoices
- [ ] Custom PDF templates
- [ ] Batch PDF generation