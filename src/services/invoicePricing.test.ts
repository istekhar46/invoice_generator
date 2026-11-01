import { describe, expect, it } from 'vitest'
import {
  calculateInvoice,
  calculateInvoiceForEdit,
  money,
  InvoiceCalculationService,
  type InvoiceSnapshot,
} from './invoiceCalculation.service'
import { transformInvoiceResponse } from '../utils/apiTransformers'
import type { InvoiceResponseDto } from './api/invoiceApi'

const items = [{ quantity: 1, rate: 1000 }]
const legacy: InvoiceSnapshot = {
  lineItems: [
    { quantity: 1, rate: 0.335, amount: 0.335 },
    { quantity: 1, rate: 0.335, amount: 0.335 },
  ],
  subtotal: 0.67,
  taxRate: 0,
  taxAmount: 0,
  total: 0.67,
}
describe('Invoice pricing contract', () => {
  it('preserves saved financial totals until pricing changes', () => {
    expect(calculateInvoiceForEdit(legacy.lineItems, 0, {}, legacy)).toEqual({
      subtotal: 0.67,
      discountAmount: 0,
      taxAmount: 0,
      total: 0.67,
      balanceDue: 0.67,
    })
    expect(
      calculateInvoiceForEdit(legacy.lineItems, 0, { amountPaid: 0.67 }, legacy)
        .balanceDue
    ).toBe(0)
    expect(() =>
      calculateInvoiceForEdit(legacy.lineItems, 0, { amountPaid: 0.68 }, legacy)
    ).toThrow('Amount paid')
  })
  it.each([
    { currency: 'EUR' },
    { discountType: 'fixed' },
    { discountValue: 1 },
    { shippingAmount: 1 },
  ])(
    'recalculates saved invoices when adjustments/currency change: %j',
    pricing => {
      expect(
        calculateInvoiceForEdit(legacy.lineItems, 0, pricing, legacy).subtotal
      ).toBe(0.68)
    }
  )
  it('recalculates saved invoices when quantities, rates, tax, or rows change', () => {
    expect(
      calculateInvoiceForEdit(legacy.lineItems, 0.1, {}, legacy)
    ).toMatchObject({ subtotal: 0.68, taxAmount: 0.07, total: 0.75 })
    expect(
      calculateInvoiceForEdit(
        [{ quantity: 2, rate: 0.335 }, legacy.lineItems[1]],
        0,
        {},
        legacy
      ).total
    ).toBe(1.01)
    expect(
      calculateInvoiceForEdit(
        [{ quantity: 1, rate: 0.4 }, legacy.lineItems[1]],
        0,
        {},
        legacy
      ).total
    ).toBe(0.74)
    expect(
      calculateInvoiceForEdit([legacy.lineItems[0]], 0, {}, legacy).total
    ).toBe(0.34)
  })
  it('accepts a payment against a preserved total that exceeds the newly rounded total', () => {
    const original = { ...legacy, subtotal: 0.69, total: 0.69 }
    expect(
      calculateInvoiceForEdit(
        original.lineItems,
        0,
        { amountPaid: 0.69 },
        original
      ).balanceDue
    ).toBe(0)
  })
  it('applies discount before tax, shipping after tax, and deducts recorded payments', () => {
    expect(
      calculateInvoice(items, 0.1, {
        discountValue: 10,
        shippingAmount: 20,
        amountPaid: 300,
      })
    ).toEqual({
      subtotal: 1000,
      discountAmount: 100,
      taxAmount: 90,
      total: 1010,
      balanceDue: 710,
    })
    expect(
      calculateInvoice(items, 0, {
        currency: 'INR',
        discountValue: 10,
        shippingAmount: 20,
        amountPaid: 300,
      }).balanceDue
    ).toBe(620)
  })
  it('supports a fixed discount', () =>
    expect(
      calculateInvoice(items, 0.1, { discountType: 'fixed', discountValue: 50 })
        .total
    ).toBe(1045))
  it('sums rounded line amounts so the table agrees with the subtotal', () =>
    expect(
      calculateInvoice(
        [
          { quantity: 1, rate: 0.335 },
          { quantity: 1, rate: 0.335 },
        ],
        0
      ).subtotal
    ).toBe(0.68))
  it('uses currency precision for JPY and KWD', () => {
    expect(
      calculateInvoice([{ quantity: 1, rate: 10.555 }], 0, { currency: 'JPY' })
        .total
    ).toBe(11)
    expect(
      calculateInvoice([{ quantity: 1, rate: 10.555 }], 0, { currency: 'KWD' })
        .total
    ).toBe(10.555)
    expect(money(-10.555)).toBe(-10.56)
    expect(money(1.005)).toBe(1.01)
  })
  it.each([
    { discountValue: 101 },
    { discountType: 'fixed', discountValue: 1001 },
    { amountPaid: 1001 },
    { shippingAmount: -1 },
    { amountPaid: NaN },
    { currency: 'XYZ' },
  ])('rejects invalid pricing %j', pricing =>
    expect(() => calculateInvoice(items, 0, pricing)).toThrow()
  )
  it('accepts a fully discounted invoice and rejects overpayment', () => {
    expect(calculateInvoice(items, 0.1, { discountValue: 100 }).total).toBe(0)
    expect(() =>
      calculateInvoice(items, 0, { discountValue: 100, amountPaid: 1 })
    ).toThrow('Amount paid')
  })
  it('rejects nonfinite and unsafe line amounts', () => {
    expect(() =>
      calculateInvoice([{ quantity: Infinity, rate: 1 }], 0)
    ).toThrow()
    expect(() =>
      calculateInvoice([{ quantity: 1e15, rate: 1e15 }], 0)
    ).toThrow()
  })
  it('retains quick-invoice snapshots and pricing when mapping an API response', () => {
    const dto = {
      id: 'one',
      invoiceNumber: 'INV-1',
      customer: null,
      isQuickInvoice: true,
      quickCompanyName: 'Acme',
      quickCustomerName: 'Client',
      currency: 'INR',
      discountValue: 10,
      amountPaid: 300,
      terms: 'Bank transfer',
      purchaseOrderNumber: 'PO-1',
      shippingAddress: 'Mumbai',
      serviceDate: new Date(),
      dueDate: new Date(),
      lineItems: [],
      subtotal: 1000,
      taxRate: 0,
      taxAmount: 0,
      total: 920,
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies InvoiceResponseDto
    expect(transformInvoiceResponse(dto)).toMatchObject({
      isQuickInvoice: true,
      quickCompanyName: 'Acme',
      quickCustomerName: 'Client',
      currency: 'INR',
      amountPaid: 300,
      terms: 'Bank transfer',
      status: 'draft',
    })
  })
  it('keeps existing line-item controls accurate for a three-decimal currency', () => {
    expect(
      InvoiceCalculationService.calculateLineItemAmount(2.5, 4.938, 'KWD')
    ).toBe(12.345)
  })
})
