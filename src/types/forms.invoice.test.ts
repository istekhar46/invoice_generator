import { describe, expect, it } from 'vitest'
import { invoiceSchema, quickInvoiceSchema } from './forms'

const standardFields = {
  serviceDate: new Date('2026-10-01'),
  dueDate: new Date('2026-10-31'),
  lineItems: [
    {
      id: 'item-1',
      type: 'material' as const,
      description: 'Panel installation',
      unit: 'each',
      quantity: 1,
      rate: 500,
      amount: 500,
    },
  ],
  notes: '',
  taxRate: 0.18,
}

describe('invoice schemas', () => {
  it('uses the same standard invoice fields for normal and quick invoices', () => {
    expect(
      invoiceSchema.safeParse({ customerId: 'customer-1', ...standardFields }).success
    ).toBe(true)
    expect(
      quickInvoiceSchema.safeParse({ quickCustomerName: 'Ada', ...standardFields }).success
    ).toBe(true)
  })

  it('enforces the same date ordering in both flows', () => {
    const invalidFields = {
      ...standardFields,
      dueDate: new Date('2026-09-30'),
    }

    expect(
      invoiceSchema.safeParse({ customerId: 'customer-1', ...invalidFields }).success
    ).toBe(false)
    expect(
      quickInvoiceSchema.safeParse({ quickCustomerName: 'Ada', ...invalidFields }).success
    ).toBe(false)
  })
})
