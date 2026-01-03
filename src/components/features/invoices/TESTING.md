# Invoice Builder Testing Guide

## Overview

This document describes how to test the invoice update functionality in the InvoiceBuilder component.

## Test File

**Location:** `src/components/features/invoices/InvoiceBuilder.test.tsx`

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Only Invoice Builder Tests

```bash
npm test InvoiceBuilder
```

## Test Coverage

The test file covers the following scenarios:

### 1. Initial State for Editing
- ✅ Loads existing invoice data when invoice prop is provided
- ✅ Populates form fields with existing invoice data
- ✅ Displays existing line items

### 2. Button Validation - Details Step
- ✅ Enables Next button when all details are valid
- ✅ Disables Next button when due date is before service date
- ✅ Shows error message for invalid date logic
- ✅ Enables Next button when dates are corrected

### 3. Button Validation - Line Items Step
- ✅ Enables Next button when line items are valid
- ✅ **Keeps Next button enabled after editing line item description**
- ✅ **Keeps Next button enabled after changing line item type**
- ✅ Disables Next button when line item has empty description
- ✅ Disables Next button when line item has invalid quantity

### 4. Button Validation - Review Step
- ✅ Enables Update Invoice button when all steps are valid
- ✅ Disables Update Invoice button after successful submission
- ✅ Shows success message after submission

### 5. Form Submission
- ✅ Calls onSave callback with transformed invoice data
- ✅ Transforms data correctly (lowercase status, etc.)
- ✅ Displays error message when update fails

### 6. Navigation
- ✅ Allows navigating back to previous steps
- ✅ Preserves form data when navigating between steps

## Key Test Scenarios

### Testing Line Item Description Update

This test verifies the fix for the issue where editing a line item description would disable the Next button:

```typescript
it('should keep Next button enabled after editing line item description', async () => {
  // 1. Navigate to items step
  // 2. Click edit button on line item
  // 3. Edit the description
  // 4. Save changes
  // 5. Verify Next button is still enabled ✅
})
```

### Testing Line Item Type Change

This test verifies the fix for the issue where changing line item type would work but Update button would stay disabled:

```typescript
it('should keep Next button enabled after changing line item type', async () => {
  // 1. Navigate to items step
  // 2. Click edit button on line item
  // 3. Change type from material to labor
  // 4. Save changes
  // 5. Verify Next button is enabled ✅
  // 6. Navigate to review step
  // 7. Verify Update Invoice button is enabled ✅
})
```

## Test Data

### Mock Invoice

```typescript
const mockInvoice: Invoice = {
  id: 'test-invoice-id',
  invoiceNumber: 'INV-001',
  customerId: 'test-customer-id',
  serviceDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-15'),
  subtotal: 100,
  taxRate: 0.08,
  taxAmount: 8,
  total: 108,
  notes: 'Test notes',
  status: 'draft',
  lineItems: [
    {
      id: 'item-1',
      type: 'material',
      description: 'Test Material',
      quantity: 5,
      rate: 20,
      amount: 100,
    },
  ],
  // ... other fields
}
```

### Mock Customer

```typescript
const mockCustomer: Customer = {
  id: 'test-customer-id',
  name: 'Test Customer',
  email: 'test@example.com',
  phone: '555-1234',
  address: '123 Test St',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  // ... other fields
}
```

## Mocked Dependencies

The tests mock the following dependencies:

1. **useCreateInvoice** - Returns mock mutation function
2. **useUpdateInvoice** - Returns mock mutation function that resolves successfully
3. **useCompanyProfile** - Returns mock company data with default tax rate
4. **useToast** - Returns mock toast functions
5. **useOnlineStatus** - Returns online status as true
6. **apiTransformers** - Mocks data transformation functions

## Testing Best Practices

### 1. User-Centric Testing

Tests use `@testing-library/user-event` to simulate real user interactions:

```typescript
const user = userEvent.setup()
await user.click(button)
await user.type(input, 'text')
await user.clear(input)
```

### 2. Async Handling

Tests properly wait for async operations:

```typescript
await waitFor(() => {
  expect(button).not.toBeDisabled()
})
```

### 3. Accessibility

Tests query elements by accessible roles and labels:

```typescript
screen.getByRole('button', { name: /next/i })
screen.getByLabelText(/due date/i)
```

### 4. Isolation

Each test is isolated with proper setup and cleanup:

```typescript
beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})
```

## Debugging Tests

### View Test Output

```bash
npm test -- --reporter=verbose
```

### Debug Specific Test

```typescript
it.only('should enable Next button when all details are valid', async () => {
  // This test will run in isolation
})
```

### View DOM State

```typescript
import { screen } from '@testing-library/react'

// Print current DOM
screen.debug()

// Print specific element
screen.debug(screen.getByRole('button'))
```

## Common Issues

### Issue: Test Timeout

**Solution:** Increase timeout for async operations:

```typescript
await waitFor(() => {
  expect(button).not.toBeDisabled()
}, { timeout: 5000 })
```

### Issue: Element Not Found

**Solution:** Use `findBy` queries for async elements:

```typescript
const button = await screen.findByRole('button', { name: /next/i })
```

### Issue: Mock Not Working

**Solution:** Ensure mocks are defined before imports:

```typescript
vi.mock('../../../hooks/useInvoices', () => ({
  useUpdateInvoice: () => ({ /* mock implementation */ })
}))
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: npm test

- name: Upload Coverage
  run: npm run test:coverage
```

## Future Test Additions

Consider adding tests for:

1. **Network Error Handling** - Test offline scenarios
2. **Validation Error Display** - Test field-level validation errors
3. **Optimistic Updates** - Test cache updates before API response
4. **Rollback on Error** - Test cache rollback when API fails
5. **Multiple Line Items** - Test with multiple line items
6. **Edge Cases** - Test boundary values (0, negative numbers, etc.)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [User Event Documentation](https://testing-library.com/docs/user-event/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Support

If tests fail unexpectedly:

1. Check that all dependencies are installed: `npm install`
2. Clear test cache: `npm test -- --clearCache`
3. Check for TypeScript errors: `npm run type-check`
4. Review test output for specific error messages
5. Use `screen.debug()` to inspect DOM state

## Conclusion

These tests ensure that the invoice update functionality works correctly, especially the button validation logic that was recently fixed. Run these tests regularly to catch regressions early.
