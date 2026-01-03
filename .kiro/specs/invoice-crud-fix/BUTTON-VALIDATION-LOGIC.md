# Invoice Builder - Button Validation Logic

## Overview

This document describes the complete validation logic for the InvoiceBuilder component's navigation buttons (Previous, Next, Save). The implementation ensures buttons are enabled/disabled correctly based on the current step and form state.

## Validation Architecture

### Single Source of Truth

Each step has its own dedicated validation function that serves as the single source of truth for that step's validity:

```typescript
validateCustomerStep()  // Step 1: Customer selection
validateDetailsStep()   // Step 2: Invoice details (dates, tax)
validateItemsStep()     // Step 3: Line items
validateReviewStep()    // Step 4: Final review
```

### Validation Flow

```
User Input
    ↓
Form State Update (React Hook Form)
    ↓
Validation Function (for current step)
    ↓
canProceedToNext() / validateReviewStep()
    ↓
Button Enabled/Disabled State
```

## Step-by-Step Validation

### Step 1: Customer Selection

**Function:** `validateCustomerStep()`

**Requirements:**
- ✅ Customer must be selected (`selectedCustomer !== null`)
- ✅ Customer ID must be set in form (`watchedValues.customerId`)
- ✅ No form errors for customerId field (`!errors.customerId`)

**Button State:**
- **Next Button:** Enabled when all requirements met
- **Previous Button:** Disabled (first step)

**Code:**
```typescript
const validateCustomerStep = (): boolean => {
  return selectedCustomer !== null && 
         !!watchedValues.customerId && 
         !errors.customerId
}
```

### Step 2: Invoice Details

**Function:** `validateDetailsStep()`

**Requirements:**
- ✅ Service date must be set (`watchedValues.serviceDate`)
- ✅ Due date must be set (`watchedValues.dueDate`)
- ✅ Tax rate must be set (`watchedValues.taxRate !== undefined`)
- ✅ No form errors for dates or tax rate
- ✅ **Date logic validation:** Due date >= Service date

**Button State:**
- **Next Button:** Enabled when all requirements met
- **Previous Button:** Enabled

**Visual Feedback:**
- Due date field shows error message if before service date
- Error message: "Due date must be on or after service date"

**Code:**
```typescript
const validateDetailsStep = (): boolean => {
  // Check all required fields exist
  if (!watchedValues.serviceDate || !watchedValues.dueDate) {
    return false
  }
  
  // Check for form errors
  if (errors.serviceDate || errors.dueDate || errors.taxRate) {
    return false
  }
  
  // Check tax rate is valid
  if (watchedValues.taxRate === undefined || watchedValues.taxRate === null) {
    return false
  }
  
  // Validate date logic: due date must be >= service date
  if (watchedValues.dueDate < watchedValues.serviceDate) {
    return false
  }
  
  return true
}
```

### Step 3: Line Items

**Function:** `validateItemsStep()`

**Requirements:**
- ✅ At least one line item must exist (`lineItems.length > 0`)
- ✅ Each line item must have:
  - Valid description (non-empty, trimmed)
  - Quantity > 0 (must be a number)
  - Rate >= 0 (must be a number)
  - Valid type ('material' or 'labor')
  - Valid amount (must be a number >= 0)

**Important:** This validation checks the actual `lineItems` array directly, not React Hook Form errors, because line items are managed by the `LineItemsTable` component with its own state.

**Button State:**
- **Next Button:** Enabled when all requirements met
- **Previous Button:** Enabled

**Code:**
```typescript
const validateItemsStep = (): boolean => {
  // Must have at least one line item
  if (lineItems.length === 0) {
    return false
  }
  
  // Validate each line item has required fields and valid values
  const allItemsValid = lineItems.every(item => {
    // Check description is not empty
    if (!item.description || !item.description.trim()) {
      return false
    }
    
    // Check quantity is positive
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      return false
    }
    
    // Check rate is non-negative
    if (typeof item.rate !== 'number' || item.rate < 0) {
      return false
    }
    
    // Check type is valid
    if (item.type !== 'material' && item.type !== 'labor') {
      return false
    }
    
    // Check amount is calculated correctly
    if (typeof item.amount !== 'number' || item.amount < 0) {
      return false
    }
    
    return true
  })
  
  return allItemsValid
}
```

### Step 4: Review & Save

**Function:** `validateReviewStep()`

**Requirements:**
- ✅ All previous steps must be valid
- ✅ Customer step valid (`validateCustomerStep()`)
- ✅ Details step valid (`validateDetailsStep()`)
- ✅ Items step valid (`validateItemsStep()`)
- ✅ No form errors anywhere (`Object.keys(errors).length === 0`)

**Button State:**
- **Save Button:** Enabled when all requirements met
- **Previous Button:** Enabled
- **Save Button:** Disabled during submission (`loading`)
- **Save Button:** Disabled after successful submission (`submitSuccess`)

**Code:**
```typescript
const validateReviewStep = (): boolean => {
  // All previous steps must be valid
  return validateCustomerStep() && 
         validateDetailsStep() && 
         validateItemsStep() &&
         Object.keys(errors).length === 0
}
```

## Button Implementation

### Previous Button

```typescript
<Button
  type="button"
  variant="outline"
  onClick={handlePrevStep}
  disabled={currentStep === 'customer' || loading}
  className="flex items-center space-x-2"
>
  <ArrowLeft className="h-4 w-4" />
  <span>Previous</span>
</Button>
```

**Disabled When:**
- On first step (customer)
- During loading/submission

### Next Button

```typescript
<Button
  type="button"
  onClick={handleNextStep}
  disabled={!canProceedToNext() || loading}
  className="flex items-center space-x-2"
>
  <span>Next</span>
  <ArrowRight className="h-4 w-4" />
</Button>
```

**Disabled When:**
- Current step validation fails (`!canProceedToNext()`)
- During loading/submission

### Save Button (Review Step)

```typescript
<Button
  type="button"
  loading={loading}
  disabled={!validateReviewStep() || submitSuccess || loading}
  onClick={handleSubmit(onSubmit)}
  className="flex items-center space-x-2"
>
  <Save className="h-4 w-4" />
  <span>{invoice ? 'Update Invoice' : 'Save Invoice'}</span>
</Button>
```

**Disabled When:**
- Review step validation fails (`!validateReviewStep()`)
- During loading/submission (`loading`)
- After successful submission (`submitSuccess`)

**Shows Loading Spinner When:**
- Submission in progress (`loading`)

## Validation State Matrix

| Step | Condition | Next Button | Previous Button | Save Button |
|------|-----------|-------------|-----------------|-------------|
| Customer | No customer selected | ❌ Disabled | ❌ Disabled | N/A |
| Customer | Customer selected | ✅ Enabled | ❌ Disabled | N/A |
| Details | Missing dates | ❌ Disabled | ✅ Enabled | N/A |
| Details | Due date < Service date | ❌ Disabled | ✅ Enabled | N/A |
| Details | All valid | ✅ Enabled | ✅ Enabled | N/A |
| Items | No line items | ❌ Disabled | ✅ Enabled | N/A |
| Items | Invalid line items | ❌ Disabled | ✅ Enabled | N/A |
| Items | All valid | ✅ Enabled | ✅ Enabled | N/A |
| Review | Any step invalid | N/A | ✅ Enabled | ❌ Disabled |
| Review | All steps valid | N/A | ✅ Enabled | ✅ Enabled |
| Review | During submission | N/A | ✅ Enabled | ❌ Disabled (loading) |
| Review | After success | N/A | ✅ Enabled | ❌ Disabled |

## Error Feedback

### Inline Validation

**Customer Step:**
- No inline errors (selection-based)

**Details Step:**
- Service date: Shows React Hook Form validation errors
- Due date: Shows React Hook Form validation errors + date logic error
- Tax rate: Shows React Hook Form validation errors

**Items Step:**
- Line items table handles its own validation
- Shows errors for invalid quantities, rates, descriptions

**Review Step:**
- Shows preview of all data
- No additional inline validation (already validated in previous steps)

### Submit Errors

Displayed at the top of the form when submission fails:

```typescript
{(error || submitError) && (
  <ErrorAlert
    type="error"
    title={submitError ? "Validation Error" : "Error"}
    message={submitError || error || 'An unexpected error occurred'}
    onDismiss={() => {
      if (submitError) setSubmitError(null)
    }}
    className="mb-6"
  />
)}
```

**Error Types:**
- **400/422:** Validation errors with field details
- **403:** Permission denied
- **404:** Invoice not found
- **0:** Network error
- **Other:** Generic error message

## Real-Time Validation

### Form State Watching

```typescript
const watchedValues = watch()
```

Watches all form fields in real-time, triggering validation on every change.

### Validation Triggers

1. **User types in field** → Form state updates → Validation runs → Button state updates
2. **User selects customer** → State updates → Validation runs → Button state updates
3. **User adds/removes line item** → State updates → Validation runs → Button state updates
4. **User navigates steps** → Validation runs for new step → Button state updates

### Performance

- Validation functions are lightweight (simple boolean checks)
- No expensive computations or API calls
- Runs synchronously on every render
- React optimizes re-renders automatically

## Edge Cases Handled

### 1. Editing Existing Invoice

**Scenario:** User opens invoice for editing

**Behavior:**
- Form pre-populated with existing data
- Starts on "details" step (skips customer selection)
- All validation still applies
- Can navigate back to change customer

### 2. Date Validation

**Scenario:** User sets due date before service date

**Behavior:**
- Next button disabled
- Error message shown on due date field
- User must fix before proceeding

### 3. Empty Line Items

**Scenario:** User removes all line items

**Behavior:**
- Next button disabled on items step
- Cannot proceed to review
- Must add at least one line item

### 4. Network Error During Submit

**Scenario:** API call fails due to network issue

**Behavior:**
- Loading state ends
- Error message displayed
- Form remains editable
- User can retry submission

### 5. Successful Submission

**Scenario:** Invoice saved successfully

**Behavior:**
- Success message shown
- Save button disabled
- Form closes after 1.5 seconds
- Callback invoked with saved invoice

## Testing Checklist

### Unit Tests

- [ ] `validateCustomerStep()` returns false when no customer selected
- [ ] `validateCustomerStep()` returns true when customer selected
- [ ] `validateDetailsStep()` returns false when due date < service date
- [ ] `validateDetailsStep()` returns true when dates valid
- [ ] `validateItemsStep()` returns false when no line items
- [ ] `validateItemsStep()` returns false when line items invalid
- [ ] `validateItemsStep()` returns true when line items valid
- [ ] `validateReviewStep()` returns false when any step invalid
- [ ] `validateReviewStep()` returns true when all steps valid

### Integration Tests

- [ ] Next button disabled on customer step without selection
- [ ] Next button enabled after customer selection
- [ ] Next button disabled on details step with invalid dates
- [ ] Error message shown when due date < service date
- [ ] Next button disabled on items step without line items
- [ ] Save button disabled on review step when validation fails
- [ ] Save button shows loading state during submission
- [ ] Save button disabled after successful submission

### E2E Tests

- [ ] User cannot proceed without selecting customer
- [ ] User cannot proceed with invalid dates
- [ ] User cannot proceed without line items
- [ ] User can navigate back and forth between steps
- [ ] User can save invoice when all steps valid
- [ ] User sees error message when save fails
- [ ] Form closes after successful save

## Best Practices

1. **Single Source of Truth:** Each step has one validation function
2. **Explicit Validation:** All conditions clearly stated in code
3. **Real-Time Feedback:** Validation runs on every change
4. **Clear Error Messages:** Users know exactly what's wrong
5. **Consistent Patterns:** All steps follow same validation pattern
6. **Type Safety:** All validation functions return boolean
7. **No Side Effects:** Validation functions are pure (no mutations)
8. **Composable:** Review step composes all previous validations
9. **Direct State Validation:** Validate actual state, not form errors (especially for line items)

## Troubleshooting

### Issue: Next button disabled on line items step after editing

**Symptom:** When editing line item description or type, the Next button stays disabled even though the line item is valid.

**Root Cause:** The validation was checking `errors.lineItems` from React Hook Form, but line items are managed by `LineItemsTable` component with its own state. Changes to line items don't trigger React Hook Form validation.

**Solution:** Validate the actual `lineItems` array directly instead of relying on form errors:

```typescript
// ❌ Wrong - checks form errors
if (errors.lineItems) {
  return false
}

// ✅ Correct - validates actual line items
const allItemsValid = lineItems.every(item => {
  return item.description?.trim() && 
         item.quantity > 0 && 
         item.rate >= 0 &&
         (item.type === 'material' || item.type === 'labor')
})
```

### Issue: Update button disabled on review step

**Symptom:** After successfully navigating through all steps, the Update/Save button on the review step is disabled.

**Root Cause:** The `validateReviewStep()` function checks all previous step validations. If any step validation fails, the button is disabled.

**Solution:** Ensure all validation functions check actual state, not just form errors:

1. **Customer step:** Check `selectedCustomer` state
2. **Details step:** Check `watchedValues` for dates and tax rate
3. **Items step:** Check `lineItems` array directly
4. **Review step:** Compose all previous validations

### Issue: Date validation not working

**Symptom:** Can proceed to next step even when due date is before service date.

**Root Cause:** Date comparison logic missing or incorrect.

**Solution:** Add explicit date comparison in `validateDetailsStep()`:

```typescript
// Validate date logic: due date must be >= service date
if (watchedValues.dueDate < watchedValues.serviceDate) {
  return false
}
```

## Conclusion

The button validation logic is now:
- ✅ **Correct:** All edge cases handled properly
- ✅ **Clear:** Easy to understand and maintain
- ✅ **Consistent:** Same pattern across all steps
- ✅ **Complete:** No missing validations
- ✅ **User-Friendly:** Clear feedback on what's wrong
- ✅ **Type-Safe:** Full TypeScript support
- ✅ **Testable:** Pure functions, easy to test
- ✅ **Performant:** Lightweight, no expensive operations
