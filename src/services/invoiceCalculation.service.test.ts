/**
 * Tests for the Invoice Calculation Service
 * Covers all calculation methods including line items, subtotals, tax, and totals
 */

import { describe, test, expect } from 'vitest'
import { InvoiceCalculationService, CalculationError } from './invoiceCalculation.service'
import type { LineItem } from '../types/entities'

describe('InvoiceCalculationService', () => {
  // Helper function to create a test line item
  const createLineItem = (
    id: string,
    quantity: number,
    rate: number,
    amount: number = 0,
    type: 'material' | 'labor' = 'labor',
    description: string = 'Test item'
  ): LineItem => ({
    id,
    invoiceId: 'test-invoice',
    type,
    description,
    quantity,
    rate,
    amount
  })

  describe('calculateLineItemAmount', () => {
    test('calculates correct amount for valid inputs', () => {
      expect(InvoiceCalculationService.calculateLineItemAmount(2, 50)).toBe(100)
      expect(InvoiceCalculationService.calculateLineItemAmount(1.5, 75.25)).toBe(112.88)
      expect(InvoiceCalculationService.calculateLineItemAmount(0, 100)).toBe(0)
      expect(InvoiceCalculationService.calculateLineItemAmount(10, 0)).toBe(0)
    })

    test('rounds to 2 decimal places', () => {
      expect(InvoiceCalculationService.calculateLineItemAmount(3, 33.333)).toBe(100)
      expect(InvoiceCalculationService.calculateLineItemAmount(1, 10.555)).toBe(10.56)
      expect(InvoiceCalculationService.calculateLineItemAmount(2.5, 12.346)).toBe(30.87)
    })

    test('throws error for negative quantity', () => {
      expect(() => InvoiceCalculationService.calculateLineItemAmount(-1, 50))
        .toThrow(CalculationError)
    })

    test('throws error for negative rate', () => {
      expect(() => InvoiceCalculationService.calculateLineItemAmount(2, -50))
        .toThrow(CalculationError)
    })

    test('throws error for non-number inputs', () => {
      expect(() => InvoiceCalculationService.calculateLineItemAmount('2' as any, 50))
        .toThrow(CalculationError)
      expect(() => InvoiceCalculationService.calculateLineItemAmount(2, '50' as any))
        .toThrow(CalculationError)
    })

    test('throws error for infinite values', () => {
      expect(() => InvoiceCalculationService.calculateLineItemAmount(Infinity, 50))
        .toThrow(CalculationError)
      expect(() => InvoiceCalculationService.calculateLineItemAmount(2, Infinity))
        .toThrow(CalculationError)
    })
  })

  describe('calculateSubtotal', () => {
    test('calculates correct subtotal for multiple line items', () => {
      const lineItems = [
        createLineItem('1', 2, 50, 100),
        createLineItem('2', 1, 75, 75),
        createLineItem('3', 3, 25, 75)
      ]
      expect(InvoiceCalculationService.calculateSubtotal(lineItems)).toBe(250)
    })

    test('returns 0 for empty array', () => {
      expect(InvoiceCalculationService.calculateSubtotal([])).toBe(0)
    })

    test('rounds subtotal to 2 decimal places', () => {
      const lineItems = [
        createLineItem('1', 1, 1, 33.333),
        createLineItem('2', 1, 1, 33.333),
        createLineItem('3', 1, 1, 33.334)
      ]
      expect(InvoiceCalculationService.calculateSubtotal(lineItems)).toBe(100)
    })

    test('throws error for non-array input', () => {
      expect(() => InvoiceCalculationService.calculateSubtotal('not-array' as any))
        .toThrow(CalculationError)
    })

    test('throws error for line item with invalid amount', () => {
      const lineItems = [
        createLineItem('1', 2, 50, NaN)
      ]
      expect(() => InvoiceCalculationService.calculateSubtotal(lineItems))
        .toThrow(CalculationError)
    })
  })

  describe('calculateTaxAmount', () => {
    test('calculates correct tax amount', () => {
      expect(InvoiceCalculationService.calculateTaxAmount(100, 0.08)).toBe(8)
      expect(InvoiceCalculationService.calculateTaxAmount(250, 0.075)).toBe(18.75)
      expect(InvoiceCalculationService.calculateTaxAmount(100, 0)).toBe(0)
    })

    test('rounds tax amount to 2 decimal places', () => {
      expect(InvoiceCalculationService.calculateTaxAmount(100, 0.08333)).toBe(8.33)
      expect(InvoiceCalculationService.calculateTaxAmount(333.33, 0.08)).toBe(26.67)
    })

    test('throws error for negative subtotal', () => {
      expect(() => InvoiceCalculationService.calculateTaxAmount(-100, 0.08))
        .toThrow(CalculationError)
    })

    test('throws error for invalid tax rate', () => {
      expect(() => InvoiceCalculationService.calculateTaxAmount(100, -0.08))
        .toThrow(CalculationError)
      expect(() => InvoiceCalculationService.calculateTaxAmount(100, 1.5))
        .toThrow(CalculationError)
    })

    test('throws error for non-number inputs', () => {
      expect(() => InvoiceCalculationService.calculateTaxAmount('100' as any, 0.08))
        .toThrow(CalculationError)
      expect(() => InvoiceCalculationService.calculateTaxAmount(100, '0.08' as any))
        .toThrow(CalculationError)
    })
  })

  describe('calculateTotal', () => {
    test('calculates correct total', () => {
      expect(InvoiceCalculationService.calculateTotal(100, 8)).toBe(108)
      expect(InvoiceCalculationService.calculateTotal(250.75, 18.75)).toBe(269.5)
      expect(InvoiceCalculationService.calculateTotal(100, 0)).toBe(100)
    })

    test('rounds total to 2 decimal places', () => {
      expect(InvoiceCalculationService.calculateTotal(100.333, 8.333)).toBe(108.67)
    })

    test('throws error for negative inputs', () => {
      expect(() => InvoiceCalculationService.calculateTotal(-100, 8))
        .toThrow(CalculationError)
      expect(() => InvoiceCalculationService.calculateTotal(100, -8))
        .toThrow(CalculationError)
    })

    test('throws error for non-number inputs', () => {
      expect(() => InvoiceCalculationService.calculateTotal('100' as any, 8))
        .toThrow(CalculationError)
      expect(() => InvoiceCalculationService.calculateTotal(100, '8' as any))
        .toThrow(CalculationError)
    })
  })

  describe('calculateInvoiceTotals', () => {
    test('calculates all totals correctly', () => {
      const lineItems = [
        createLineItem('1', 2, 50, 100),
        createLineItem('2', 1, 75, 75),
        createLineItem('3', 3, 25, 75)
      ]
      const totals = InvoiceCalculationService.calculateInvoiceTotals(lineItems, 0.08)
      
      expect(totals.subtotal).toBe(250)
      expect(totals.taxAmount).toBe(20)
      expect(totals.total).toBe(270)
    })

    test('handles zero tax rate', () => {
      const lineItems = [
        createLineItem('1', 2, 50, 100)
      ]
      const totals = InvoiceCalculationService.calculateInvoiceTotals(lineItems, 0)
      
      expect(totals.subtotal).toBe(100)
      expect(totals.taxAmount).toBe(0)
      expect(totals.total).toBe(100)
    })

    test('handles empty line items', () => {
      const totals = InvoiceCalculationService.calculateInvoiceTotals([], 0.08)
      
      expect(totals.subtotal).toBe(0)
      expect(totals.taxAmount).toBe(0)
      expect(totals.total).toBe(0)
    })
  })

  describe('updateLineItemAmount', () => {
    test('updates line item amount correctly', () => {
      const lineItem = createLineItem('1', 2, 50, 0)
      const updated = InvoiceCalculationService.updateLineItemAmount(lineItem)
      
      expect(updated.amount).toBe(100)
      expect(updated.id).toBe('1')
      expect(updated.quantity).toBe(2)
      expect(updated.rate).toBe(50)
    })

    test('returns new object without mutating original', () => {
      const lineItem = createLineItem('1', 2, 50, 0)
      const updated = InvoiceCalculationService.updateLineItemAmount(lineItem)
      
      expect(updated).not.toBe(lineItem)
      expect(lineItem.amount).toBe(0) // Original unchanged
      expect(updated.amount).toBe(100) // New object updated
    })

    test('throws error for invalid line item', () => {
      expect(() => InvoiceCalculationService.updateLineItemAmount(null as any))
        .toThrow(CalculationError)
      expect(() => InvoiceCalculationService.updateLineItemAmount({} as any))
        .toThrow(CalculationError)
    })
  })

  describe('updateAllLineItemAmounts', () => {
    test('updates all line item amounts', () => {
      const lineItems = [
        createLineItem('1', 2, 50, 0),
        createLineItem('2', 1, 75, 0),
        createLineItem('3', 3, 25, 0)
      ]
      const updated = InvoiceCalculationService.updateAllLineItemAmounts(lineItems)
      
      expect(updated[0].amount).toBe(100)
      expect(updated[1].amount).toBe(75)
      expect(updated[2].amount).toBe(75)
    })

    test('returns new array without mutating original', () => {
      const lineItems = [createLineItem('1', 2, 50, 0)]
      const updated = InvoiceCalculationService.updateAllLineItemAmounts(lineItems)
      
      expect(updated).not.toBe(lineItems)
      expect(lineItems[0].amount).toBe(0) // Original unchanged
      expect(updated[0].amount).toBe(100) // New array updated
    })

    test('throws error for non-array input', () => {
      expect(() => InvoiceCalculationService.updateAllLineItemAmounts('not-array' as any))
        .toThrow(CalculationError)
    })
  })

  describe('roundCurrency', () => {
    test('rounds to 2 decimal places correctly', () => {
      expect(InvoiceCalculationService.roundCurrency(10.555)).toBe(10.56)
      expect(InvoiceCalculationService.roundCurrency(10.554)).toBe(10.55)
      expect(InvoiceCalculationService.roundCurrency(10.5)).toBe(10.5)
      expect(InvoiceCalculationService.roundCurrency(10)).toBe(10)
    })

    test('handles negative values', () => {
      expect(InvoiceCalculationService.roundCurrency(-10.555)).toBe(-10.56)
      expect(InvoiceCalculationService.roundCurrency(-10.554)).toBe(-10.55)
    })

    test('throws error for non-number input', () => {
      expect(() => InvoiceCalculationService.roundCurrency('10.5' as any))
        .toThrow(CalculationError)
    })

    test('throws error for infinite values', () => {
      expect(() => InvoiceCalculationService.roundCurrency(Infinity))
        .toThrow(CalculationError)
      expect(() => InvoiceCalculationService.roundCurrency(-Infinity))
        .toThrow(CalculationError)
    })
  })

  describe('validateLineItem', () => {
    test('validates correct line item', () => {
      const lineItem = createLineItem('1', 2, 50, 100)
      expect(InvoiceCalculationService.validateLineItem(lineItem)).toBe(true)
    })

    test('throws error for missing ID', () => {
      const lineItem = { ...createLineItem('1', 2, 50, 100), id: '' }
      expect(() => InvoiceCalculationService.validateLineItem(lineItem))
        .toThrow(CalculationError)
    })

    test('throws error for invalid quantity', () => {
      const lineItem = { ...createLineItem('1', 2, 50, 100), quantity: -1 }
      expect(() => InvoiceCalculationService.validateLineItem(lineItem))
        .toThrow(CalculationError)
    })

    test('throws error for invalid rate', () => {
      const lineItem = { ...createLineItem('1', 2, 50, 100), rate: -50 }
      expect(() => InvoiceCalculationService.validateLineItem(lineItem))
        .toThrow(CalculationError)
    })

    test('throws error for missing description', () => {
      const lineItem = { ...createLineItem('1', 2, 50, 100), description: '' }
      expect(() => InvoiceCalculationService.validateLineItem(lineItem))
        .toThrow(CalculationError)
    })

    test('throws error for invalid type', () => {
      const lineItem = { ...createLineItem('1', 2, 50, 100), type: 'invalid' as any }
      expect(() => InvoiceCalculationService.validateLineItem(lineItem))
        .toThrow(CalculationError)
    })
  })
})