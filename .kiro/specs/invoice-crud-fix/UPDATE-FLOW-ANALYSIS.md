# Invoice Update Flow - Clean Implementation

## Overview

This document describes the end-to-end flow for updating invoices, from the UI component through the API layer to the backend, with proper data transformations at each layer.

## Flow Diagram

```
User Edit Form (InvoiceBuilder)
         ↓
    Form Data (InvoiceFormData)
    - Dates as Date objects
    - Enums as lowercase ('material', 'labor')
         ↓
    Transform line items only
    (transformLineItemToDto)
         ↓
    Update Payload
    - customerId: string
    - serviceDate: Date
    - dueDate: Date
    - lineItems: CreateLineItemDto[] (uppercase enums)
    - notes?: string
    - taxRate: number
         ↓
    useUpdateInvoice Hook
    - Optimistic cache update
    - Call invoiceApi.updateInvoice()
         ↓
    invoiceApi.updateInvoice()
    - Transform dates: Date → ISO string
    - Omit undefined values
    - Keep uppercase enums
         ↓
    API Request (UpdateInvoiceDto)
    - customerId?: string
    - serviceDate?: string (ISO 8601)
    - dueDate?: string (ISO 8601)
    - lineItems?: CreateLineItemDto[]
    - notes?: string
    - taxRate?: number
         ↓
    Backend (NestJS)
    - Validate DTO with class-validator
    - Transform ISO strings → Date objects
    - Process update in transaction
    - Return InvoiceResponseDto
         ↓
    API Response (InvoiceResponseDto)
    - Dates as ISO strings
    - Enums as uppercase
    - Nested customer object
         ↓
    useUpdateInvoice Hook
    - Update cache with response
    - Show success toast
    - Invalidate related queries
         ↓
    InvoiceBuilder
    - Transform response (transformInvoiceResponse)
    - Call onSave callback
    - Close form
```

## Layer Responsibilities

### 1. InvoiceBuilder Component (UI Layer)

**File:** `src/components/features/invoices/InvoiceBuilder.tsx`

**Responsibilities:**
- Collect user input via form
- Validate form data (client-side)
- Transform line items to API format (uppercase enums)
- Build update payload with Date objects
- Handle success/error states
- Display user-friendly error messages

**Data Format:**
```typescript
const payload = {
  customerId: string,
  serviceDate: Date,        // Date object
  dueDate: Date,           // Date object
  lineItems: CreateLineItemDto[], // Uppercase enums
  notes?: string,
  taxRate: number
}
```

**Key Code:**
```typescript
const payload = {
  customerId: data.customerId,
  serviceDate: data.serviceDate, // Date object
  dueDate: data.dueDate,         // Date object
  lineItems: lineItems.map(transformLineItemToDto), // Transform enums
  notes: data.notes || undefined,
  taxRate: data.taxRate,
}

await updateInvoice.mutateAsync({ id: invoice.id, data: payload })
```

### 2. useUpdateInvoice Hook (State Management Layer)

**File:** `src/hooks/useInvoices.ts`

**Responsibilities:**
- Manage mutation state (loading, error, success)
- Implement optimistic updates
- Handle rollback on error
- Show toast notifications
- Invalidate related queries
- Pass data to API layer

**Key Features:**
- Optimistic cache updates for immediate UI feedback
- Automatic rollback if API call fails
- Comprehensive error handling with user-friendly messages
- Cache invalidation to ensure consistency

**Key Code:**
```typescript
onMutate: async ({ id, data }) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey: queryKeys.invoice(id) })
  
  // Snapshot for rollback
  const previousInvoice = queryClient.getQueryData(queryKeys.invoice(id))
  
  // Optimistically update cache
  queryClient.setQueryData(queryKeys.invoice(id), {
    ...previousInvoice,
    ...data,
    updatedAt: new Date(),
  })
  
  return { previousInvoice }
},
onError: (err, { id }, context) => {
  // Rollback on error
  if (context?.previousInvoice) {
    queryClient.setQueryData(queryKeys.invoice(id), context.previousInvoice)
  }
  
  // Show error toast
  error('Failed to update invoice', err?.message)
}
```

### 3. invoiceApi.updateInvoice (API Client Layer)

**File:** `src/services/api/invoiceApi.ts`

**Responsibilities:**
- Transform Date objects to ISO 8601 strings
- Omit undefined values from payload
- Send HTTP PUT request
- Return response DTO

**Data Transformation:**
```typescript
// Input: Date objects
serviceDate: Date
dueDate: Date

// Output: ISO strings
serviceDate: "2024-01-15T00:00:00.000Z"
dueDate: "2024-02-15T00:00:00.000Z"
```

**Key Code:**
```typescript
async updateInvoice(id: string, data: UpdateInvoiceDto): Promise<InvoiceResponseDto> {
  const transformedData: any = {}
  
  // Transform dates to ISO strings
  if (data.serviceDate !== undefined) {
    transformedData.serviceDate = data.serviceDate instanceof Date
      ? data.serviceDate.toISOString()
      : new Date(data.serviceDate).toISOString()
  }
  
  if (data.dueDate !== undefined) {
    transformedData.dueDate = data.dueDate instanceof Date
      ? data.dueDate.toISOString()
      : new Date(data.dueDate).toISOString()
  }
  
  // Include other fields if provided
  if (data.customerId !== undefined) transformedData.customerId = data.customerId
  if (data.lineItems !== undefined) transformedData.lineItems = data.lineItems
  if (data.notes !== undefined) transformedData.notes = data.notes || undefined
  if (data.taxRate !== undefined) transformedData.taxRate = data.taxRate
  
  return apiClient.put<InvoiceResponseDto>(`${this.basePath}/${id}`, transformedData)
}
```

### 4. Backend Service (NestJS)

**File:** `backend/src/invoice/invoice.service.ts`

**Responsibilities:**
- Validate DTO with class-validator
- Transform ISO strings back to Date objects (automatic via class-transformer)
- Validate business rules (dates, ownership, etc.)
- Update database in transaction
- Recalculate totals if needed
- Handle line items atomically (delete old, create new)
- Return updated invoice with relations

**Key Features:**
- Partial updates supported (only provided fields are updated)
- Atomic line item replacement (transaction-based)
- Automatic total recalculation
- Comprehensive logging
- Authorization checks

## Data Transformation Summary

### Frontend → Backend

| Field | Frontend Format | API Format | Backend Format |
|-------|----------------|------------|----------------|
| serviceDate | `Date` | `"2024-01-15T00:00:00.000Z"` | `Date` |
| dueDate | `Date` | `"2024-02-15T00:00:00.000Z"` | `Date` |
| lineItems[].type | `'material'` | `'MATERIAL'` | `'MATERIAL'` |
| notes | `string \| undefined` | `string \| undefined` | `string \| null` |

### Backend → Frontend

| Field | Backend Format | API Format | Frontend Format |
|-------|---------------|------------|-----------------|
| serviceDate | `Date` | `"2024-01-15T00:00:00.000Z"` | `Date` |
| dueDate | `Date` | `"2024-02-15T00:00:00.000Z"` | `Date` |
| status | `'DRAFT'` | `'DRAFT'` | `'draft'` |
| lineItems[].type | `'MATERIAL'` | `'MATERIAL'` | `'material'` |

## Error Handling

### Error Flow

```
Backend Error
    ↓
API Client (catches HTTP error)
    ↓
useUpdateInvoice Hook
- Rollback optimistic update
- Show error toast
    ↓
InvoiceBuilder Component
- Catch error from mutation
- Display error in UI
- Allow user to retry
```

### Error Messages by Status Code

| Status | Hook Toast | Component Display |
|--------|-----------|-------------------|
| 400/422 | "Invalid invoice data: [message]" | "Validation error: [details]" |
| 403 | "Access denied" | "You do not have permission..." |
| 404 | "Invoice not found" | "Invoice not found. It may have been deleted." |
| 0 | "Cannot update while offline" | "Network error. Please check your connection..." |
| Other | "Failed to update invoice" | "An unexpected error occurred..." |

## Cache Management

### Optimistic Updates

1. **Before API call:**
   - Cancel any pending queries for the invoice
   - Snapshot current cache state
   - Update cache with new data
   - UI reflects changes immediately

2. **On success:**
   - Keep optimistic update
   - Invalidate queries to refetch fresh data
   - Show success toast

3. **On error:**
   - Restore snapshot (rollback)
   - Show error toast
   - UI reverts to previous state

### Cache Invalidation

After successful update, invalidate:
- `queryKeys.invoice(id)` - Single invoice detail
- `queryKeys.invoices` - All invoice lists
- `queryKeys.dashboard` - Dashboard statistics

## Testing Checklist

### Unit Tests
- [ ] transformLineItemToDto converts lowercase to uppercase
- [ ] invoiceApi.updateInvoice transforms dates to ISO strings
- [ ] useUpdateInvoice performs optimistic updates
- [ ] useUpdateInvoice rolls back on error

### Integration Tests
- [ ] Full update flow from UI to database
- [ ] Partial updates (notes only, tax rate only, line items only)
- [ ] Date transformations work end-to-end
- [ ] Error handling displays correct messages
- [ ] Cache updates correctly after successful update
- [ ] Cache rolls back correctly after failed update

### E2E Tests
- [ ] User can edit invoice and see changes immediately
- [ ] User sees error message if update fails
- [ ] User can retry after error
- [ ] Invoice list updates after edit
- [ ] Dashboard statistics update after edit

## Common Issues and Solutions

### Issue 1: Dates not updating
**Cause:** Date objects not transformed to ISO strings before API call
**Solution:** Transform in `invoiceApi.updateInvoice()` method

### Issue 2: Line items not replaced
**Cause:** Backend not deleting old line items before creating new ones
**Solution:** Use transaction to delete then create (already implemented)

### Issue 3: Cache not updating
**Cause:** Query keys don't match or invalidation not called
**Solution:** Use consistent query keys and invalidate in `onSettled`

### Issue 4: Optimistic update not rolling back
**Cause:** Previous state not snapshotted correctly
**Solution:** Snapshot in `onMutate` and restore in `onError`

### Issue 5: Enum case mismatch
**Cause:** Frontend uses lowercase, backend expects uppercase
**Solution:** Transform in `transformLineItemToDto()` before API call

## Best Practices

1. **Single Responsibility:** Each layer has one clear responsibility
2. **Data Transformation:** Transform at layer boundaries, not in the middle
3. **Error Handling:** Handle errors at every layer with appropriate messages
4. **Optimistic Updates:** Always snapshot before optimistic update
5. **Cache Invalidation:** Invalidate related queries after mutations
6. **Type Safety:** Use TypeScript interfaces to enforce contracts
7. **Logging:** Log at each layer for debugging (especially backend)
8. **Validation:** Validate at both frontend and backend

## Conclusion

This clean implementation ensures:
- ✅ Proper data transformations at each layer
- ✅ Optimistic updates with rollback
- ✅ Comprehensive error handling
- ✅ Cache consistency
- ✅ Type safety throughout
- ✅ Clear separation of concerns
- ✅ Easy to test and maintain
