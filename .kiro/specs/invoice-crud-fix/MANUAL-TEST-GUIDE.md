# Manual Testing Guide - Invoice Update Functionality

## Overview

This guide provides step-by-step instructions for manually testing the invoice update functionality to verify that all button validation logic and data transformations work correctly.

## Prerequisites

1. **Backend Running:** Ensure the backend server is running on `http://localhost:8000`
2. **Frontend Running:** Ensure the frontend is running on `http://localhost:5173` (or your configured port)
3. **Test Data:** You need at least one customer and one invoice in the system

## Test Setup

### 1. Create Test Customer (if needed)

1. Navigate to Customers page
2. Click "Add Customer"
3. Fill in customer details:
   - Name: Test Customer
   - Email: test@example.com
   - Phone: (555) 123-4567
   - Address: 123 Test St
   - City: Test City
   - State: TS
   - Zip: 12345
4. Click "Save Customer"

### 2. Create Test Invoice (if needed)

1. Navigate to Invoices page
2. Click "Create Invoice"
3. Select the test customer
4. Set service date: Today's date
5. Set due date: 30 days from today
6. Set tax rate: 8%
7. Add line items:
   - Type: Material
   - Description: Test Material
   - Quantity: 5
   - Rate: 20.00
8. Add notes: "Original test invoice"
9. Complete and save the invoice

## Test Cases

### Test Case 1: Edit Invoice - Navigate to Edit Mode

**Objective:** Verify that clicking edit on an invoice loads the form correctly

**Steps:**
1. Go to Invoices page
2. Find your test invoice
3. Click the "Edit" button (pencil icon)

**Expected Results:**
- ✅ Invoice Builder opens
- ✅ Form starts on "Invoice Details" step (skips customer selection)
- ✅ Customer name is displayed at the top
- ✅ Service date is pre-filled
- ✅ Due date is pre-filled
- ✅ Tax rate is pre-filled
- ✅ Notes are pre-filled

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 2: Details Step - Date Validation

**Objective:** Verify that date validation works correctly

**Steps:**
1. In the Invoice Builder (Details step)
2. Change the due date to a date BEFORE the service date
3. Observe the "Next" button

**Expected Results:**
- ✅ "Next" button becomes DISABLED
- ✅ Error message appears under due date field: "Due date must be on or after service date"

**Steps (continued):**
4. Change the due date to a date AFTER the service date
5. Observe the "Next" button

**Expected Results:**
- ✅ Error message disappears
- ✅ "Next" button becomes ENABLED

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 3: Details Step - Tax Rate Validation

**Objective:** Verify that tax rate validation works

**Steps:**
1. In the Invoice Builder (Details step)
2. Clear the tax rate field
3. Observe the "Next" button

**Expected Results:**
- ✅ "Next" button becomes DISABLED

**Steps (continued):**
4. Enter a valid tax rate (e.g., 10)
5. Observe the "Next" button

**Expected Results:**
- ✅ "Next" button becomes ENABLED

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 4: Line Items Step - Edit Description Only

**Objective:** Verify that editing only the description enables the Next button

**Steps:**
1. Click "Next" to go to Line Items step
2. Click the "Edit" button (pencil icon) on an existing line item
3. Change ONLY the description (e.g., "Updated Material Description")
4. Click the "Save" button (checkmark icon)
5. Observe the "Next" button

**Expected Results:**
- ✅ Line item is updated with new description
- ✅ "Next" button is ENABLED (not disabled)
- ✅ Can proceed to next step

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 5: Line Items Step - Change Type Only

**Objective:** Verify that changing only the type enables the Next button

**Steps:**
1. In the Line Items step
2. Click "Edit" on an existing line item
3. Change ONLY the type (Material → Labor or Labor → Material)
4. Click "Save"
5. Observe the "Next" button

**Expected Results:**
- ✅ Line item type is updated
- ✅ "Next" button is ENABLED
- ✅ Can proceed to next step

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 6: Line Items Step - Edit Quantity

**Objective:** Verify that editing quantity updates amount and enables Next button

**Steps:**
1. In the Line Items step
2. Click "Edit" on an existing line item
3. Change the quantity (e.g., from 5 to 10)
4. Observe the amount calculation
5. Click "Save"
6. Observe the "Next" button

**Expected Results:**
- ✅ Amount is recalculated correctly (quantity × rate)
- ✅ Line item is updated
- ✅ "Next" button is ENABLED

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 7: Line Items Step - Edit Rate

**Objective:** Verify that editing rate updates amount and enables Next button

**Steps:**
1. In the Line Items step
2. Click "Edit" on an existing line item
3. Change the rate (e.g., from 20.00 to 25.00)
4. Observe the amount calculation
5. Click "Save"
6. Observe the "Next" button

**Expected Results:**
- ✅ Amount is recalculated correctly (quantity × rate)
- ✅ Line item is updated
- ✅ "Next" button is ENABLED

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 8: Line Items Step - Invalid Description

**Objective:** Verify that empty description prevents saving

**Steps:**
1. In the Line Items step
2. Click "Edit" on an existing line item
3. Clear the description field (make it empty)
4. Click "Save"

**Expected Results:**
- ✅ Error message appears: "Description is required"
- ✅ Line item is NOT saved
- ✅ Edit form remains open

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 9: Line Items Step - Invalid Quantity

**Objective:** Verify that zero or negative quantity prevents saving

**Steps:**
1. In the Line Items step
2. Click "Edit" on an existing line item
3. Set quantity to 0
4. Click "Save"

**Expected Results:**
- ✅ Error message appears: "Quantity must be a positive number"
- ✅ Line item is NOT saved

**Steps (continued):**
5. Set quantity to -5
6. Click "Save"

**Expected Results:**
- ✅ Error message appears
- ✅ Line item is NOT saved

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 10: Line Items Step - Add New Line Item

**Objective:** Verify that adding a new line item works correctly

**Steps:**
1. In the Line Items step
2. Click "Add Item" button
3. Fill in the form:
   - Type: Labor
   - Description: Additional Labor
   - Quantity: 2
   - Rate: 75.00
4. Click "Add Item" (or checkmark)
5. Observe the line items table

**Expected Results:**
- ✅ New line item appears in the table
- ✅ Amount is calculated correctly (2 × 75 = 150)
- ✅ Subtotal is updated
- ✅ "Next" button is ENABLED

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 11: Line Items Step - Delete Line Item

**Objective:** Verify that deleting a line item works correctly

**Steps:**
1. In the Line Items step (with at least 2 line items)
2. Click "Delete" button (trash icon) on one line item
3. Observe the table

**Expected Results:**
- ✅ Line item is removed from the table
- ✅ Subtotal is updated
- ✅ "Next" button remains ENABLED (if at least 1 item remains)

**Steps (continued):**
4. Delete all remaining line items
5. Observe the "Next" button

**Expected Results:**
- ✅ "Next" button becomes DISABLED
- ✅ Message appears: "No line items yet"

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 12: Review Step - Update Button Enabled

**Objective:** Verify that Update Invoice button is enabled when all data is valid

**Steps:**
1. Complete all previous steps with valid data
2. Click "Next" to reach the Review step
3. Observe the "Update Invoice" button

**Expected Results:**
- ✅ Invoice preview is displayed correctly
- ✅ All data is shown (customer, dates, line items, totals)
- ✅ "Update Invoice" button is ENABLED

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 13: Review Step - Update Button Disabled (Invalid Data)

**Objective:** Verify that Update button is disabled if any step has invalid data

**Steps:**
1. Navigate to Review step
2. Click "Previous" to go back to Line Items
3. Delete all line items
4. Try to click "Next"

**Expected Results:**
- ✅ "Next" button is DISABLED
- ✅ Cannot proceed to Review step

**Steps (continued):**
5. Add a valid line item
6. Click "Next" to return to Review
7. Observe the "Update Invoice" button

**Expected Results:**
- ✅ "Update Invoice" button is ENABLED again

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 14: Submit Update - Success

**Objective:** Verify that updating an invoice works end-to-end

**Steps:**
1. Make changes to the invoice:
   - Change notes to "Updated via manual test"
   - Edit a line item description
   - Change tax rate to 10%
2. Navigate to Review step
3. Click "Update Invoice"
4. Wait for the operation to complete

**Expected Results:**
- ✅ "Update Invoice" button shows loading spinner
- ✅ Button becomes disabled during submission
- ✅ Success message appears: "Invoice updated successfully"
- ✅ Form closes after ~1.5 seconds
- ✅ Invoice list is updated with new data

**Steps (continued):**
5. Find the updated invoice in the list
6. Click to view details

**Expected Results:**
- ✅ Notes show "Updated via manual test"
- ✅ Line item description is updated
- ✅ Tax rate is 10%
- ✅ Totals are recalculated correctly

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 15: Submit Update - Network Error

**Objective:** Verify error handling when network is unavailable

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Set throttling to "Offline"
4. In the Invoice Builder, make changes
5. Navigate to Review step
6. Click "Update Invoice"

**Expected Results:**
- ✅ Error message appears: "Network error. Please check your internet connection and try again."
- ✅ Form remains open
- ✅ Data is not lost
- ✅ Can retry after reconnecting

**Steps (continued):**
7. Set throttling back to "Online"
8. Click "Update Invoice" again

**Expected Results:**
- ✅ Update succeeds
- ✅ Success message appears

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 16: Navigation - Back and Forth

**Objective:** Verify that navigation preserves data

**Steps:**
1. In Details step, change notes to "Test navigation"
2. Click "Next" to go to Line Items
3. Edit a line item
4. Click "Next" to go to Review
5. Click "Previous" to go back to Line Items
6. Observe the line item changes
7. Click "Previous" to go back to Details
8. Observe the notes field

**Expected Results:**
- ✅ Line item changes are preserved
- ✅ Notes still show "Test navigation"
- ✅ All changes are maintained during navigation
- ✅ Can navigate freely without losing data

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 17: Cancel Edit

**Objective:** Verify that canceling edit doesn't save changes

**Steps:**
1. Open an invoice for editing
2. Make several changes (notes, line items, etc.)
3. Close the form without saving (click X or outside modal)
4. Go back to the invoice list
5. Open the same invoice again

**Expected Results:**
- ✅ Changes are NOT saved
- ✅ Invoice shows original data
- ✅ No unintended modifications

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

### Test Case 18: Multiple Line Items

**Objective:** Verify that multiple line items work correctly

**Steps:**
1. Edit an invoice
2. Add 5 different line items with various types, quantities, and rates
3. Edit 2 of them
4. Delete 1 of them
5. Navigate to Review
6. Verify all calculations

**Expected Results:**
- ✅ All line items are displayed correctly
- ✅ Subtotal = sum of all line item amounts
- ✅ Tax amount = subtotal × tax rate
- ✅ Total = subtotal + tax amount
- ✅ All calculations are accurate

**Status:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________

---

## Test Summary

### Results

- **Total Test Cases:** 18
- **Passed:** _____
- **Failed:** _____
- **Blocked:** _____

### Critical Issues Found

1. _______________________________________
2. _______________________________________
3. _______________________________________

### Minor Issues Found

1. _______________________________________
2. _______________________________________
3. _______________________________________

### Recommendations

_______________________________________
_______________________________________
_______________________________________

### Tester Information

- **Tester Name:** _______________________________________
- **Date:** _______________________________________
- **Environment:** _______________________________________
- **Browser:** _______________________________________
- **Browser Version:** _______________________________________

### Sign-off

- **Tested By:** _______________________ Date: _______
- **Reviewed By:** _______________________ Date: _______

---

## Troubleshooting

### Issue: Tests won't run

**Solution:** Ensure both backend and frontend are running:
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
npm run dev
```

### Issue: Cannot find test invoice

**Solution:** Create a new invoice following the Test Setup section

### Issue: Changes not saving

**Solution:** 
1. Check browser console for errors (F12)
2. Check network tab for failed requests
3. Verify backend is running
4. Check backend logs for errors

### Issue: Button stays disabled

**Solution:**
1. Verify all validation requirements are met
2. Check browser console for errors
3. Try refreshing the page and starting over

---

## Additional Notes

- Take screenshots of any issues encountered
- Note the exact steps that led to any problems
- Check browser console for error messages
- Check network tab for failed API requests
- Document any unexpected behavior

