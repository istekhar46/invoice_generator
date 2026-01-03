# Invoice Update Test Execution Guide

## Quick Start

### Run the Invoice Builder Tests

```bash
# Run all tests
npm test

# Run only InvoiceBuilder tests
npm test InvoiceBuilder

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with UI (interactive browser interface)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test File Location

**Test File:** `src/components/features/invoices/InvoiceBuilder.test.tsx`

**Component:** `src/components/features/invoices/InvoiceBuilder.tsx`

## What These Tests Verify

### ✅ Fixed Issues

1. **Line Item Description Edit**
   - ✅ Next button stays enabled after editing description
   - ✅ Validates actual line items state, not form errors

2. **Line Item Type Change**
   - ✅ Next button stays enabled after changing type
   - ✅ Update Invoice button enables on review step

3. **Date Validation**
   - ✅ Next button disabled when due date < service date
   - ✅ Error message shown for invalid dates
   - ✅ Next button enabled when dates corrected

### ✅ Core Functionality

1. **Initial State**
   - Loads existing invoice data
   - Populates all form fields
   - Displays existing line items

2. **Button Validation**
   - Details step: Validates dates and tax rate
   - Items step: Validates line items
   - Review step: Validates all previous steps

3. **Form Submission**
   - Calls update API with correct data
   - Transforms data properly
   - Shows success/error messages
   - Disables button after submission

4. **Navigation**
   - Can navigate between steps
   - Preserves form data
   - Previous button works correctly

## Expected Test Results

When you run the tests, you should see:

```
✓ InvoiceBuilder - Update Invoice Functionality (15)
  ✓ Initial State for Editing (3)
    ✓ should load existing invoice data when invoice prop is provided
    ✓ should populate form fields with existing invoice data
    ✓ should display existing line items
  ✓ Button Validation - Details Step (3)
    ✓ should enable Next button when all details are valid
    ✓ should disable Next button when due date is before service date
    ✓ should enable Next button when dates are corrected
  ✓ Button Validation - Line Items Step (5)
    ✓ should enable Next button when line items are valid
    ✓ should keep Next button enabled after editing line item description
    ✓ should keep Next button enabled after changing line item type
    ✓ should disable Next button when line item has empty description
    ✓ should disable Next button when line item has invalid quantity
  ✓ Button Validation - Review Step (2)
    ✓ should enable Update Invoice button when all steps are valid
    ✓ should disable Update Invoice button after successful submission
  ✓ Form Submission (2)
    ✓ should call onSave callback with transformed invoice data
    ✓ should display error message when update fails
  ✓ Navigation (2)
    ✓ should allow navigating back to previous steps
    ✓ should preserve form data when navigating between steps

Test Files  1 passed (1)
     Tests  15 passed (15)
  Start at  XX:XX:XX
  Duration  XXXms
```

## Troubleshooting

### Tests Fail to Run

**Issue:** `Cannot find module` errors

**Solution:**
```bash
npm install
```

### Tests Timeout

**Issue:** Tests hang or timeout

**Solution:** Check if any async operations are not properly awaited. The tests use `waitFor` with appropriate timeouts.

### Mock Issues

**Issue:** Mocks not working as expected

**Solution:** Ensure mocks are defined before the component imports. Check `vi.mock()` calls at the top of the test file.

### TypeScript Errors

**Issue:** Type errors in test file

**Solution:**
```bash
npm run type-check
```

## Test Coverage

To see which parts of the code are covered by tests:

```bash
npm run test:coverage
```

This will generate a coverage report showing:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

Coverage report will be in: `coverage/index.html`

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example: GitHub Actions
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Manual Testing Checklist

After running automated tests, manually verify:

### 1. Line Item Description Edit
- [ ] Open existing invoice for editing
- [ ] Navigate to Line Items step
- [ ] Click Edit on a line item
- [ ] Change only the description
- [ ] Click Save
- [ ] **Verify:** Next button is enabled ✅

### 2. Line Item Type Change
- [ ] Open existing invoice for editing
- [ ] Navigate to Line Items step
- [ ] Click Edit on a line item
- [ ] Change type from Material to Labor (or vice versa)
- [ ] Click Save
- [ ] **Verify:** Next button is enabled ✅
- [ ] Click Next to go to Review step
- [ ] **Verify:** Update Invoice button is enabled ✅

### 3. Date Validation
- [ ] Open existing invoice for editing
- [ ] On Details step, set Due Date before Service Date
- [ ] **Verify:** Next button is disabled ✅
- [ ] **Verify:** Error message shown ✅
- [ ] Correct the Due Date
- [ ] **Verify:** Next button is enabled ✅

### 4. Complete Update Flow
- [ ] Open existing invoice for editing
- [ ] Modify notes on Details step
- [ ] Click Next
- [ ] Edit a line item on Items step
- [ ] Click Next
- [ ] Review changes on Review step
- [ ] Click Update Invoice
- [ ] **Verify:** Success message shown ✅
- [ ] **Verify:** Invoice updated in list ✅

## Performance Benchmarks

Expected test execution times:

- **Single test:** < 100ms
- **Full test suite:** < 5 seconds
- **With coverage:** < 10 seconds

If tests are slower, check for:
- Unnecessary `waitFor` delays
- Missing `vi.clearAllMocks()` in beforeEach
- Unresolved promises

## Next Steps

After tests pass:

1. ✅ Run manual testing checklist
2. ✅ Test in development environment
3. ✅ Test in staging environment
4. ✅ Deploy to production
5. ✅ Monitor for errors

## Support

If you encounter issues:

1. Check test output for specific error messages
2. Review the TESTING.md file for detailed documentation
3. Use `screen.debug()` to inspect DOM state
4. Check browser console for runtime errors
5. Verify all dependencies are up to date

## Conclusion

These tests provide comprehensive coverage of the invoice update functionality, ensuring that the button validation logic works correctly and that users can successfully update invoices through the UI.

**All tests should pass** ✅

If any tests fail, review the error messages and fix the issues before deploying to production.
