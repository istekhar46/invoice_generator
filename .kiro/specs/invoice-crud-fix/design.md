# Design Document: Invoice CRUD Fix

## Overview

This design addresses critical issues with invoice update and delete operations in the electrician invoice application. While create and list operations function correctly, update and delete operations fail due to data transformation inconsistencies, improper error handling, and cache management issues.

The solution involves:
1. **Root Cause Analysis**: Systematic diagnosis of update and delete failures across the stack
2. **Data Transformation Layer**: Consistent serialization/deserialization of dates and enums
3. **Error Handling**: Comprehensive error capture and user-friendly messaging
4. **Cache Management**: Proper optimistic updates with rollback capabilities
5. **Testing Strategy**: Unit and integration tests to prevent regressions

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  UI Components                                               │
│  ├─ InvoiceBuilder (Edit Form)                              │
│  └─ InvoiceList (Delete Actions)                            │
├─────────────────────────────────────────────────────────────┤
│  React Hooks (TanStack Query)                               │
│  ├─ useUpdateInvoice (Mutation + Cache)                     │
│  └─ useDeleteInvoice (Mutation + Cache)                     │
├─────────────────────────────────────────────────────────────┤
│  API Client Layer                                            │
│  ├─ invoiceApi.updateInvoice()                              │
│  ├─ invoiceApi.deleteInvoice()                              │
│  └─ Data Transformers (apiTransformers.ts)                  │
├─────────────────────────────────────────────────────────────┤
│  HTTP Client (Axios)                                         │
│  └─ apiClient with interceptors                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP (JSON)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (NestJS)                          │
├─────────────────────────────────────────────────────────────┤
│  Controllers                                                 │
│  ├─ PUT /invoices/:id                                        │
│  └─ DELETE /invoices/:id                                     │
├─────────────────────────────────────────────────────────────┤
│  Services                                                    │
│  ├─ InvoiceService.update()                                 │
│  └─ InvoiceService.delete()                                 │
├─────────────────────────────────────────────────────────────┤
│  DTOs & Validation                                           │
│  ├─ UpdateInvoiceDto (class-validator)                      │
│  └─ Transformation (class-transformer)                      │
├─────────────────────────────────────────────────────────────┤
│  Database (Prisma ORM)                                       │
│  └─ PostgreSQL                                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Update Operation:**
```
User Edit → InvoiceBuilder → useUpdateInvoice → invoiceApi.updateInvoice
  → Transform Data → HTTP PUT → Backend Controller → Service Layer
  → Prisma Transaction → Database → Response → Transform Response
  → Update Cache → UI Update
```

**Delete Operation:**
```
User Delete → InvoiceList → useDeleteInvoice → invoiceApi.deleteInvoice
  → HTTP DELETE → Backend Controller → Service Layer → Prisma Delete
  → 204 No Content → Handle Empty Response → Invalidate Cache → UI Update
```

## Components and Interfaces

### 1. Data Transformation Layer

**Purpose**: Ensure consistent data format between frontend and backend

**Location**: `src/utils/apiTransformers.ts`

**Functions**:

```typescript
// Transform frontend Invoice to API UpdateInvoiceDto
function transformInvoiceToUpdateDto(invoice: Partial<InvoiceFormData>): UpdateInvoiceDto {
  return {
    customerId: invoice.customerId,
    serviceDate: invoice.serviceDate?.toISOString(), // Date → ISO string
    dueDate: invoice.dueDate?.toISOString(),         // Date → ISO string
    lineItems: invoice.lineItems?.map(transformLineItemToDto),
    notes: invoice.notes || undefined,
    taxRate: invoice.taxRate,
  }
}

// Transform API response to frontend Invoice
function transformInvoiceResponse(response: InvoiceResponseDto): Invoice {
  return {
    ...response,
    serviceDate: new Date(response.serviceDate),     // ISO string → Date
    dueDate: new Date(response.dueDate),             // ISO string → Date
    createdAt: new Date(response.createdAt),
    updatedAt: new Date(response.updatedAt),
    status: response.status.toLowerCase() as InvoiceStatus, // DRAFT → draft
  }
}

// Transform line item to API format
function transformLineItemToDto(item: LineItem): CreateLineItemDto {
  return {
    type: item.type.toUpperCase() as 'MATERIAL' | 'LABOR', // material → MATERIAL
    description: item.description,
    quantity: item.quantity,
    rate: item.rate,
  }
}
```

### 2. API Client Layer

**Purpose**: Handle HTTP communication with proper error handling

**Location**: `src/services/api/invoiceApi.ts`

**Update Method**:
```typescript
async updateInvoice(id: string, data: UpdateInvoiceDto): Promise<InvoiceResponseDto> {
  // Transform data before sending
  const transformedData = transformInvoiceToUpdateDto(data)
  
  // Send PUT request
  const response = await apiClient.put<InvoiceResponseDto>(
    `${this.basePath}/${id}`, 
    transformedData
  )
  
  // Response is already transformed by apiClient interceptor
  return response
}
```

**Delete Method**:
```typescript
async deleteInvoice(id: string): Promise<void> {
  // DELETE returns 204 No Content (empty response)
  await apiClient.delete<void>(`${this.basePath}/${id}`)
  // No return value needed for 204 responses
}
```

**API Client Configuration**:
```typescript
// In apiClient.ts - ensure 204 responses are handled
apiClient.interceptors.response.use(
  (response) => {
    // Handle 204 No Content
    if (response.status === 204) {
      return response // Return response object, not data
    }
    return response.data
  },
  (error) => {
    // Enhanced error handling
    if (error.response) {
      // Server responded with error status
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Request failed',
        data: error.response.data,
      }
    } else if (error.request) {
      // Request made but no response
      throw {
        status: 0,
        message: 'Network error - please check your connection',
      }
    } else {
      // Something else happened
      throw {
        status: 0,
        message: error.message || 'An unexpected error occurred',
      }
    }
  }
)
```

### 3. React Hooks Layer

**Purpose**: Manage mutations and cache updates with TanStack Query

**Location**: `src/hooks/useInvoices.ts`

**Update Hook**:
```typescript
export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceDto }) =>
      invoiceApi.updateInvoice(id, data),
    
    // Optimistic update
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.invoice(id) })
      
      // Snapshot previous value
      const previousInvoice = queryClient.getQueryData(queryKeys.invoice(id))
      
      // Optimistically update cache
      if (previousInvoice) {
        queryClient.setQueryData(queryKeys.invoice(id), {
          ...previousInvoice,
          ...data,
          updatedAt: new Date(),
        })
      }
      
      return { previousInvoice }
    },
    
    // Rollback on error
    onError: (err, { id }, context) => {
      if (context?.previousInvoice) {
        queryClient.setQueryData(queryKeys.invoice(id), context.previousInvoice)
      }
      
      // User-friendly error messages
      if (!isOnline) {
        error('Cannot update while offline', 'Please check your connection')
      } else if (err?.status === 400) {
        error('Invalid data', err?.data?.message || 'Please check your input')
      } else if (err?.status === 404) {
        error('Invoice not found', 'The invoice may have been deleted')
      } else {
        error('Update failed', 'Please try again')
      }
    },
    
    // Success handling
    onSuccess: (updatedInvoice) => {
      success('Invoice updated', `Invoice ${updatedInvoice.invoiceNumber} updated`)
    },
    
    // Always refetch to ensure consistency
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
    },
  })
}
```

**Delete Hook**:
```typescript
export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: (id: string) => invoiceApi.deleteInvoice(id),
    
    // Optimistic delete
    onMutate: async (invoiceId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.invoices })
      
      // Snapshot all invoice lists
      const previousLists = queryClient.getQueriesData({ 
        queryKey: queryKeys.invoices 
      })
      
      // Optimistically remove from all lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.invoices },
        (old: PaginatedInvoiceResponse | undefined) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.filter(inv => inv.id !== invoiceId),
            total: old.total - 1,
          }
        }
      )
      
      return { previousLists, invoiceId }
    },
    
    // Rollback on error
    onError: (err, _, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      
      // User-friendly error messages
      if (!isOnline) {
        error('Cannot delete while offline', 'Please check your connection')
      } else if (err?.status === 404) {
        error('Invoice not found', 'The invoice may already be deleted')
      } else if (err?.status === 403) {
        error('Access denied', 'You do not have permission to delete this invoice')
      } else {
        error('Delete failed', 'Please try again')
      }
    },
    
    // Success handling
    onSuccess: () => {
      success('Invoice deleted', 'Invoice removed successfully')
    },
    
    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
      // Also invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}
```

### 4. Backend Service Layer

**Purpose**: Handle business logic and database operations

**Location**: `backend/src/invoice/invoice.service.ts`

**Update Method Improvements**:
```typescript
async update(
  userId: string,
  id: string,
  updateInvoiceDto: UpdateInvoiceDto,
): Promise<InvoiceWithRelations> {
  // Validate at least one field is being updated
  if (Object.keys(updateInvoiceDto).length === 0) {
    throw new BadRequestException('At least one field must be provided')
  }

  // Validate invoice ownership
  await this.validateInvoiceOwnership(id, userId)

  // Validate customer ownership if changing customer
  if (updateInvoiceDto.customerId) {
    await this.validateCustomerOwnership(updateInvoiceDto.customerId, userId)
  }

  // Get existing invoice for date validation
  const existingInvoice = await this.prisma.invoice.findFirst({
    where: this.buildUserIsolatedWhere(userId, { id }),
  })

  if (!existingInvoice) {
    throw new NotFoundException('Invoice not found')
  }

  // Validate dates if provided
  if (updateInvoiceDto.serviceDate || updateInvoiceDto.dueDate) {
    const serviceDate = updateInvoiceDto.serviceDate || existingInvoice.serviceDate
    const dueDate = updateInvoiceDto.dueDate || existingInvoice.dueDate
    this.validateInvoiceDates(serviceDate, dueDate)
  }

  // Use transaction for atomic updates
  await this.prisma.$transaction(async (tx) => {
    let updateData: any = { ...updateInvoiceDto }

    // Handle line items update
    if (updateInvoiceDto.lineItems) {
      const taxRate = updateInvoiceDto.taxRate ?? existingInvoice.taxRate
      const totals = this.calculateTotals(updateInvoiceDto.lineItems, taxRate)
      
      updateData = {
        ...updateData,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
      }

      // Delete existing line items
      await tx.lineItem.deleteMany({ where: { invoiceId: id } })

      // Create new line items
      await tx.lineItem.createMany({
        data: updateInvoiceDto.lineItems.map((item) => ({
          invoiceId: id,
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
        })),
      })
    } else if (updateInvoiceDto.taxRate !== undefined) {
      // Recalculate totals if only tax rate changed
      const existingLineItems = await tx.lineItem.findMany({
        where: { invoiceId: id },
      })

      const lineItemDtos = existingLineItems.map(item => ({
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
      }))

      const totals = this.calculateTotals(lineItemDtos, updateInvoiceDto.taxRate)
      
      updateData = {
        ...updateData,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
      }
    }

    // Remove lineItems from updateData (handled separately)
    delete updateData.lineItems

    // Update invoice with user isolation
    const result = await tx.invoice.updateMany({
      where: this.buildUserIsolatedWhere(userId, { id }),
      data: updateData,
    })

    if (result.count === 0) {
      throw new NotFoundException('Invoice not found or access denied')
    }
  })

  // Return updated invoice with relations
  return await this.findById(userId, id)
}
```

**Delete Method Improvements**:
```typescript
async delete(userId: string, id: string): Promise<void> {
  // Validate invoice ownership
  await this.validateInvoiceOwnership(id, userId)

  // Delete with user isolation (line items cascade automatically)
  const result = await this.prisma.invoice.deleteMany({
    where: this.buildUserIsolatedWhere(userId, { id }),
  })

  if (result.count === 0) {
    throw new NotFoundException('Invoice not found or access denied')
  }
  
  // No return value for 204 No Content
}
```

### 5. UI Components

**InvoiceBuilder Updates**:
```typescript
const onSubmit = async (data: InvoiceFormData) => {
  try {
    setSubmitError(null)
    
    // Validate required fields
    if (!selectedCustomer || lineItems.length === 0) {
      setSubmitError('Please select a customer and add line items')
      return
    }
    
    // Validate date logic
    if (data.dueDate < data.serviceDate) {
      setSubmitError('Due date cannot be before service date')
      return
    }
    
    // Transform data for API
    const transformedData = {
      customerId: data.customerId,
      serviceDate: data.serviceDate, // Will be transformed by API client
      dueDate: data.dueDate,
      lineItems: lineItems.map(transformLineItemToDto),
      notes: data.notes || undefined,
      taxRate: data.taxRate,
    }
    
    if (invoice) {
      // Update existing invoice
      const updated = await updateInvoice.mutateAsync({ 
        id: invoice.id, 
        data: transformedData 
      })
      onSave?.(transformInvoiceResponse(updated))
    } else {
      // Create new invoice
      const created = await createInvoice.mutateAsync(transformedData)
      onSave?.(transformInvoiceResponse(created))
    }
  } catch (error) {
    console.error('Failed to save invoice:', error)
    setSubmitError(
      error?.message || 'An unexpected error occurred'
    )
  }
}
```

**InvoiceList Delete Confirmation**:
```typescript
const confirmDelete = async () => {
  if (!deletingInvoice) return
  
  try {
    await deleteInvoiceMutation.mutateAsync(deletingInvoice.id)
    setShowDeleteConfirm(false)
    setDeletingInvoice(null)
  } catch (error) {
    // Error is already handled by the hook
    console.error('Delete failed:', error)
  }
}
```

## Data Models

### Frontend Types

```typescript
// Invoice form data (used in InvoiceBuilder)
interface InvoiceFormData {
  customerId: string
  serviceDate: Date
  dueDate: Date
  lineItems: LineItem[]
  notes?: string
  taxRate: number
}

// Line item (frontend representation)
interface LineItem {
  id?: string
  type: 'material' | 'labor'  // lowercase
  description: string
  quantity: number
  rate: number
  amount: number
}

// Invoice entity (frontend representation)
interface Invoice {
  id: string
  userId: string
  invoiceNumber: string
  customerId: string
  serviceDate: Date
  dueDate: Date
  lineItems: LineItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  notes?: string
  status: 'draft' | 'sent' | 'paid'  // lowercase
  createdAt: Date
  updatedAt: Date
}
```

### Backend DTOs

```typescript
// Update DTO (partial of Create DTO)
class UpdateInvoiceDto {
  customerId?: string
  serviceDate?: Date
  dueDate?: Date
  lineItems?: CreateLineItemDto[]
  notes?: string
  taxRate?: number
}

// Line item DTO
class CreateLineItemDto {
  type: 'MATERIAL' | 'LABOR'  // UPPERCASE
  description: string
  quantity: number
  rate: number
}

// Response DTO
class InvoiceResponseDto {
  id: string
  invoiceNumber: string
  customer: CustomerResponseDto
  serviceDate: Date  // ISO string in JSON
  dueDate: Date      // ISO string in JSON
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  notes?: string
  status: 'DRAFT' | 'SENT' | 'PAID'  // UPPERCASE
  lineItems: LineItemResponseDto[]
  createdAt: Date    // ISO string in JSON
  updatedAt: Date    // ISO string in JSON
}
```

## Error Handling

### Error Types and Handling

```typescript
// Error type definition
interface ApiError {
  status: number
  message: string
  data?: any
}

// Error handling in API client
function handleApiError(error: any): never {
  if (error.response) {
    // Server responded with error
    const apiError: ApiError = {
      status: error.response.status,
      message: error.response.data?.message || 'Request failed',
      data: error.response.data,
    }
    throw apiError
  } else if (error.request) {
    // No response received
    throw {
      status: 0,
      message: 'Network error - please check your connection',
    }
  } else {
    // Request setup error
    throw {
      status: 0,
      message: error.message || 'An unexpected error occurred',
    }
  }
}

// Error messages by status code
const ERROR_MESSAGES = {
  400: 'Invalid data - please check your input',
  401: 'Please log in to continue',
  403: 'You do not have permission to perform this action',
  404: 'Invoice not found',
  409: 'Conflict - the invoice may have been modified',
  500: 'Server error - please try again later',
  0: 'Network error - please check your connection',
}

// User-friendly error display
function getErrorMessage(error: ApiError): string {
  return ERROR_MESSAGES[error.status] || error.message || 'An error occurred'
}
```

### Validation Errors

```typescript
// Backend validation error format
interface ValidationError {
  field: string
  message: string
}

// Frontend validation error handling
function handleValidationErrors(errors: ValidationError[]) {
  errors.forEach(({ field, message }) => {
    // Set field-level error in form
    setError(field, { type: 'manual', message })
  })
}
```

## Testing Strategy

### Unit Tests

**Backend Service Tests**:
```typescript
describe('InvoiceService.update', () => {
  it('should update invoice with valid data', async () => {
    const updateDto = {
      notes: 'Updated notes',
      taxRate: 0.10,
    }
    const result = await service.update(userId, invoiceId, updateDto)
    expect(result.notes).toBe('Updated notes')
    expect(result.taxRate).toBe(0.10)
  })

  it('should recalculate totals when line items change', async () => {
    const updateDto = {
      lineItems: [
        { type: 'MATERIAL', description: 'Wire', quantity: 100, rate: 1.50 },
      ],
      taxRate: 0.08,
    }
    const result = await service.update(userId, invoiceId, updateDto)
    expect(result.subtotal).toBe(150)
    expect(result.taxAmount).toBe(12)
    expect(result.total).toBe(162)
  })

  it('should throw NotFoundException for non-existent invoice', async () => {
    await expect(
      service.update(userId, 'invalid-id', {})
    ).rejects.toThrow(NotFoundException)
  })

  it('should throw BadRequestException for empty update', async () => {
    await expect(
      service.update(userId, invoiceId, {})
    ).rejects.toThrow(BadRequestException)
  })
})

describe('InvoiceService.delete', () => {
  it('should delete invoice and cascade line items', async () => {
    await service.delete(userId, invoiceId)
    
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
    expect(invoice).toBeNull()
    
    const lineItems = await prisma.lineItem.findMany({ where: { invoiceId } })
    expect(lineItems).toHaveLength(0)
  })

  it('should throw NotFoundException for non-existent invoice', async () => {
    await expect(
      service.delete(userId, 'invalid-id')
    ).rejects.toThrow(NotFoundException)
  })

  it('should prevent deleting another user\'s invoice', async () => {
    await expect(
      service.delete('other-user-id', invoiceId)
    ).rejects.toThrow(NotFoundException)
  })
})
```

**Frontend Hook Tests**:
```typescript
describe('useUpdateInvoice', () => {
  it('should optimistically update cache', async () => {
    const { result } = renderHook(() => useUpdateInvoice(), { wrapper })
    
    act(() => {
      result.current.mutate({ id: 'inv-1', data: { notes: 'Updated' } })
    })
    
    // Cache should be updated immediately
    const cached = queryClient.getQueryData(['invoice', 'inv-1'])
    expect(cached.notes).toBe('Updated')
  })

  it('should rollback on error', async () => {
    server.use(
      rest.put('/api/invoices/:id', (req, res, ctx) => {
        return res(ctx.status(400), ctx.json({ message: 'Invalid data' }))
      })
    )
    
    const { result } = renderHook(() => useUpdateInvoice(), { wrapper })
    
    await act(async () => {
      try {
        await result.current.mutateAsync({ id: 'inv-1', data: { notes: 'Bad' } })
      } catch (e) {
        // Expected error
      }
    })
    
    // Cache should be rolled back
    const cached = queryClient.getQueryData(['invoice', 'inv-1'])
    expect(cached.notes).toBe('Original notes')
  })
})

describe('useDeleteInvoice', () => {
  it('should remove invoice from cache', async () => {
    const { result } = renderHook(() => useDeleteInvoice(), { wrapper })
    
    await act(async () => {
      await result.current.mutateAsync('inv-1')
    })
    
    // Invoice should be removed from lists
    const cached = queryClient.getQueryData(['invoices', 'list'])
    expect(cached.data.find(inv => inv.id === 'inv-1')).toBeUndefined()
  })

  it('should handle 204 No Content response', async () => {
    server.use(
      rest.delete('/api/invoices/:id', (req, res, ctx) => {
        return res(ctx.status(204))
      })
    )
    
    const { result } = renderHook(() => useDeleteInvoice(), { wrapper })
    
    await act(async () => {
      await result.current.mutateAsync('inv-1')
    })
    
    expect(result.current.isSuccess).toBe(true)
  })
})
```

### Integration Tests

**E2E Update Flow**:
```typescript
describe('Invoice Update E2E', () => {
  it('should update invoice from UI to database', async () => {
    // Render invoice builder with existing invoice
    render(<InvoiceBuilder invoice={mockInvoice} onSave={onSave} />)
    
    // Navigate to details step
    await userEvent.click(screen.getByText('Next'))
    
    // Update notes
    const notesInput = screen.getByLabelText('Notes')
    await userEvent.clear(notesInput)
    await userEvent.type(notesInput, 'Updated notes')
    
    // Navigate to review and save
    await userEvent.click(screen.getByText('Next'))
    await userEvent.click(screen.getByText('Next'))
    await userEvent.click(screen.getByText('Update Invoice'))
    
    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Invoice updated successfully')).toBeInTheDocument()
    })
    
    // Verify database was updated
    const updated = await prisma.invoice.findUnique({ 
      where: { id: mockInvoice.id } 
    })
    expect(updated.notes).toBe('Updated notes')
  })
})
```

**E2E Delete Flow**:
```typescript
describe('Invoice Delete E2E', () => {
  it('should delete invoice from UI to database', async () => {
    render(<InvoiceList />)
    
    // Click delete button
    const deleteButton = screen.getAllByLabelText('Delete invoice')[0]
    await userEvent.click(deleteButton)
    
    // Confirm deletion
    await userEvent.click(screen.getByText('Delete Invoice'))
    
    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Invoice deleted')).toBeInTheDocument()
    })
    
    // Verify invoice is removed from UI
    expect(screen.queryByText(mockInvoice.invoiceNumber)).not.toBeInTheDocument()
    
    // Verify database deletion
    const deleted = await prisma.invoice.findUnique({ 
      where: { id: mockInvoice.id } 
    })
    expect(deleted).toBeNull()
  })
})
```



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Partial Update Acceptance

*For any* invoice and any subset of valid update fields, the backend update endpoint should accept the partial update and modify only the specified fields while preserving all other fields.

**Validates: Requirements 1.1**

### Property 2: Date Round-Trip Consistency

*For any* Date object in the frontend, when serialized to ISO 8601 format, sent to the backend, and deserialized back to a Date object, the resulting date should represent the same point in time (within millisecond precision).

**Validates: Requirements 1.2, 2.1, 5.1, 5.3**

### Property 3: Update Response Cache Synchronization

*For any* successful update response from the backend, the React hook should update the query cache such that subsequent reads return the updated invoice data.

**Validates: Requirements 1.3, 2.4**

### Property 4: Line Items Atomic Replacement

*For any* invoice update that includes line items, after the update completes, the invoice should contain exactly the line items from the update request and no line items from before the update.

**Validates: Requirements 1.4, 2.3**

### Property 5: Validation Error Surfacing

*For any* validation error returned by the backend (400 status with field-level errors), the frontend should display an error message that includes information about which field failed validation.

**Validates: Requirements 1.5, 2.2, 6.1**

### Property 6: Optimistic Update with Rollback

*For any* invoice update mutation, the cache should be optimistically updated before the API responds, and if the API returns an error, the cache should be rolled back to its state before the mutation was initiated.

**Validates: Requirements 2.5, 7.1, 7.2**

### Property 7: Cascade Deletion of Line Items

*For any* invoice deletion, all line items associated with that invoice should also be deleted from the database (cascade delete).

**Validates: Requirements 3.4**

### Property 8: Authorization on Delete

*For any* delete request where the requesting user does not own the invoice, the backend should reject the request with a 403 or 404 status code and the invoice should remain in the database.

**Validates: Requirements 3.5, 4.2**

### Property 9: Cache Removal on Delete

*For any* successful invoice deletion, the deleted invoice should be removed from all query caches (invoice lists, detail cache) and related queries (dashboard, customer invoices) should be invalidated.

**Validates: Requirements 3.3, 4.5, 7.3, 7.5**

### Property 10: Delete Rollback on Failure

*For any* failed invoice deletion, if the invoice was optimistically removed from the cache, it should be restored to all affected caches.

**Validates: Requirements 7.4**

### Property 11: Enum Case Transformation

*For any* line item with type 'material' or 'labor' (lowercase), when transformed for the API, the type should be converted to 'MATERIAL' or 'LABOR' (uppercase), and when receiving responses, uppercase enums should be converted back to lowercase.

**Validates: Requirements 5.2**

### Property 12: Customer Data Extraction

*For any* invoice response from the API that includes nested customer data, the frontend should correctly extract and structure the customer information into a Customer object.

**Validates: Requirements 5.4**

### Property 13: Optional Field Handling

*For any* invoice update where optional fields (like notes) are undefined, the API request should either omit those fields or send null, and the backend should handle both cases correctly without errors.

**Validates: Requirements 5.5**

### Property 14: Success Notification Display

*For any* successful update or delete operation, the frontend should invoke a success notification callback with relevant invoice details (invoice number for updates, confirmation message for deletes).

**Validates: Requirements 6.5**

### Example Test 1: 204 No Content Response Handling

When the backend delete endpoint successfully deletes an invoice, it should return HTTP status 204 No Content with an empty response body, and the frontend API client should treat this as a successful operation (resolved promise).

**Validates: Requirements 3.1, 3.2, 4.3, 4.4**

### Example Test 2: Authorization Error Message

When a delete request fails with a 403 Forbidden status, the frontend should display an error message indicating "Access denied" or "You do not have permission to delete this invoice".

**Validates: Requirements 6.3**

