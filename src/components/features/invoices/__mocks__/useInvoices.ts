import { vi } from 'vitest'

export const mockCreateInvoiceMutate = vi.fn()
export const mockUpdateInvoiceMutate = vi.fn().mockResolvedValue({
  id: 'test-invoice-id',
  invoiceNumber: 'INV-001',
  customerId: 'test-customer-id',
  serviceDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-15'),
  subtotal: 100,
  taxRate: 0.08,
  taxAmount: 8,
  total: 108,
  notes: 'Updated notes',
  status: 'DRAFT',
  lineItems: [
    {
      id: 'item-1',
      type: 'MATERIAL',
      description: 'Updated Material',
      quantity: 5,
      rate: 20,
      amount: 100,
    },
  ],
  customer: {
    id: 'test-customer-id',
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '555-1234',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
})

export const useCreateInvoice = vi.fn(() => ({
  mutateAsync: mockCreateInvoiceMutate,
  isPending: false,
  error: null,
}))

export const useUpdateInvoice = vi.fn(() => ({
  mutateAsync: mockUpdateInvoiceMutate,
  isPending: false,
  error: null,
}))
