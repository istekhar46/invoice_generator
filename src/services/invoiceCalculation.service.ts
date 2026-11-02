import type { LineItem, InvoiceTotals } from '../types/entities'
import {
  calculateInvoice,
  CalculationError,
  money,
} from '../../backend/src/invoice/invoice-calculation'
export {
  calculateInvoice,
  calculateInvoiceForEdit,
  invoicePricingChanged,
  paymentBalance,
  CalculationError,
  money,
  currencyDigits,
  SUPPORTED_CURRENCIES,
} from '../../backend/src/invoice/invoice-calculation'
export type {
  InvoicePricing,
  CalculatedInvoice,
  InvoiceSnapshot,
} from '../../backend/src/invoice/invoice-calculation'

/** Existing line-item controls delegate to the same arithmetic used by the API. */
export class InvoiceCalculationService {
  static calculateLineItemAmount(
    quantity: number,
    rate: number,
    currency = 'USD'
  ): number {
    return calculateInvoice([{ quantity, rate }], 0, { currency }).total
  }
  static calculateSubtotal(items: { id: string; amount: number }[]): number {
    if (!Array.isArray(items))
      throw new CalculationError('Line items must be an array')
    return money(
      items.reduce((sum, item) => {
        if (typeof item.amount !== 'number' || !Number.isFinite(item.amount))
          throw new CalculationError('Invalid line item amount')
        return sum + item.amount
      }, 0)
    )
  }
  static calculateTaxAmount(subtotal: number, taxRate: number): number {
    return calculateInvoice([{ quantity: 1, rate: subtotal }], taxRate)
      .taxAmount
  }
  static calculateTotal(subtotal: number, taxAmount: number): number {
    if (
      typeof subtotal !== 'number' ||
      typeof taxAmount !== 'number' ||
      subtotal < 0 ||
      taxAmount < 0
    )
      throw new CalculationError('Invalid amounts')
    return money(subtotal + taxAmount)
  }
  static calculateInvoiceTotals(
    items: { id: string; amount: number }[],
    taxRate: number
  ): InvoiceTotals {
    return calculateInvoice(
      [{ quantity: 1, rate: this.calculateSubtotal(items) }],
      taxRate
    )
  }
  static updateLineItemAmount(item: LineItem): LineItem {
    if (!item?.id) throw new CalculationError('Line item must have an ID')
    return {
      ...item,
      amount: this.calculateLineItemAmount(item.quantity, item.rate),
    }
  }
  static updateAllLineItemAmounts(items: LineItem[]): LineItem[] {
    if (!Array.isArray(items))
      throw new CalculationError('Line items must be an array')
    return items.map(item => this.updateLineItemAmount(item))
  }
  static roundCurrency(value: number): number {
    return money(value)
  }
  static validateLineItem(item: Partial<LineItem>): boolean {
    if (
      !item?.id ||
      !item.description?.trim() ||
      !item.unit?.trim() ||
      !['product', 'service'].includes(item.type || '')
    )
      throw new CalculationError('Invalid line item')
    this.calculateLineItemAmount(item.quantity as number, item.rate as number)
    return true
  }
}
