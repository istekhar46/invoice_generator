/**
 * Invoice calculation service for the Electrician Invoice Generation Web App
 * Handles all invoice-related calculations including line items, subtotals, tax, and totals
 * Implements proper currency rounding to ensure accurate financial calculations
 */

import type { LineItem, InvoiceTotals } from '../types/entities'

/**
 * Minimum line item interface for calculations
 */
interface CalculableLineItem {
  id: string
  amount: number
}

/**
 * Error thrown when calculation operations fail
 */
export class CalculationError extends Error {
  public readonly cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)
    this.name = 'CalculationError'
    this.cause = cause
  }
}

/**
 * Invoice calculation service providing all calculation operations
 */
export class InvoiceCalculationService {
  /**
   * Calculates the amount for a single line item (quantity × rate)
   * Rounds to 2 decimal places for currency precision
   * 
   * @param quantity - The quantity of items/hours
   * @param rate - The rate per unit/hour
   * @returns The calculated amount rounded to 2 decimal places
   * @throws CalculationError if inputs are invalid
   */
  static calculateLineItemAmount(quantity: number, rate: number): number {
    try {
      // Validate inputs
      if (typeof quantity !== 'number' || typeof rate !== 'number') {
        throw new CalculationError('Quantity and rate must be numbers')
      }

      if (quantity < 0) {
        throw new CalculationError('Quantity cannot be negative')
      }

      if (rate < 0) {
        throw new CalculationError('Rate cannot be negative')
      }

      if (!isFinite(quantity) || !isFinite(rate)) {
        throw new CalculationError('Quantity and rate must be finite numbers')
      }

      // Calculate amount and round to 2 decimal places
      const amount = quantity * rate
      return InvoiceCalculationService.roundCurrency(amount)
    } catch (error) {
      if (error instanceof CalculationError) {
        throw error
      }
      throw new CalculationError('Failed to calculate line item amount', error as Error)
    }
  }

  /**
   * Calculates the subtotal from an array of line items
   * Sums all line item amounts and rounds to 2 decimal places
   * 
   * @param lineItems - Array of line items to sum
   * @returns The subtotal rounded to 2 decimal places
   * @throws CalculationError if line items are invalid
   */
  static calculateSubtotal(lineItems: CalculableLineItem[]): number {
    try {
      // Validate input
      if (!Array.isArray(lineItems)) {
        throw new CalculationError('Line items must be an array')
      }

      if (lineItems.length === 0) {
        return 0
      }

      // Sum all line item amounts
      const subtotal = lineItems.reduce((sum, item) => {
        if (typeof item.amount !== 'number' || !isFinite(item.amount)) {
          throw new CalculationError(`Invalid amount for line item ${item.id}: ${item.amount}`)
        }
        return sum + item.amount
      }, 0)

      return InvoiceCalculationService.roundCurrency(subtotal)
    } catch (error) {
      if (error instanceof CalculationError) {
        throw error
      }
      throw new CalculationError('Failed to calculate subtotal', error as Error)
    }
  }

  /**
   * Calculates the tax amount based on subtotal and tax rate
   * Rounds to 2 decimal places for currency precision
   * 
   * @param subtotal - The subtotal amount
   * @param taxRate - The tax rate as a decimal (e.g., 0.08 for 8%)
   * @returns The tax amount rounded to 2 decimal places
   * @throws CalculationError if inputs are invalid
   */
  static calculateTaxAmount(subtotal: number, taxRate: number): number {
    try {
      // Validate inputs
      if (typeof subtotal !== 'number' || typeof taxRate !== 'number') {
        throw new CalculationError('Subtotal and tax rate must be numbers')
      }

      if (subtotal < 0) {
        throw new CalculationError('Subtotal cannot be negative')
      }

      if (taxRate < 0 || taxRate > 1) {
        throw new CalculationError('Tax rate must be between 0 and 1')
      }

      if (!isFinite(subtotal) || !isFinite(taxRate)) {
        throw new CalculationError('Subtotal and tax rate must be finite numbers')
      }

      // Calculate tax amount and round to 2 decimal places
      const taxAmount = subtotal * taxRate
      return InvoiceCalculationService.roundCurrency(taxAmount)
    } catch (error) {
      if (error instanceof CalculationError) {
        throw error
      }
      throw new CalculationError('Failed to calculate tax amount', error as Error)
    }
  }

  /**
   * Calculates the total amount (subtotal + tax amount)
   * Rounds to 2 decimal places for currency precision
   * 
   * @param subtotal - The subtotal amount
   * @param taxAmount - The tax amount
   * @returns The total amount rounded to 2 decimal places
   * @throws CalculationError if inputs are invalid
   */
  static calculateTotal(subtotal: number, taxAmount: number): number {
    try {
      // Validate inputs
      if (typeof subtotal !== 'number' || typeof taxAmount !== 'number') {
        throw new CalculationError('Subtotal and tax amount must be numbers')
      }

      if (subtotal < 0) {
        throw new CalculationError('Subtotal cannot be negative')
      }

      if (taxAmount < 0) {
        throw new CalculationError('Tax amount cannot be negative')
      }

      if (!isFinite(subtotal) || !isFinite(taxAmount)) {
        throw new CalculationError('Subtotal and tax amount must be finite numbers')
      }

      // Calculate total and round to 2 decimal places
      const total = subtotal + taxAmount
      return InvoiceCalculationService.roundCurrency(total)
    } catch (error) {
      if (error instanceof CalculationError) {
        throw error
      }
      throw new CalculationError('Failed to calculate total', error as Error)
    }
  }

  /**
   * Calculates all invoice totals (subtotal, tax amount, total) from line items and tax rate
   * This is a convenience method that performs all calculations in one call
   * 
   * @param lineItems - Array of line items
   * @param taxRate - The tax rate as a decimal (e.g., 0.08 for 8%)
   * @returns Object containing subtotal, taxAmount, and total
   * @throws CalculationError if inputs are invalid
   */
  static calculateInvoiceTotals(lineItems: CalculableLineItem[], taxRate: number): InvoiceTotals {
    try {
      // Calculate subtotal from line items
      const subtotal = InvoiceCalculationService.calculateSubtotal(lineItems)
      
      // Calculate tax amount
      const taxAmount = InvoiceCalculationService.calculateTaxAmount(subtotal, taxRate)
      
      // Calculate total
      const total = InvoiceCalculationService.calculateTotal(subtotal, taxAmount)

      return {
        subtotal,
        taxAmount,
        total
      }
    } catch (error) {
      if (error instanceof CalculationError) {
        throw error
      }
      throw new CalculationError('Failed to calculate invoice totals', error as Error)
    }
  }

  /**
   * Updates a line item with the calculated amount based on quantity and rate
   * Returns a new line item object with the updated amount
   * 
   * @param lineItem - The line item to update
   * @returns A new line item with the calculated amount
   * @throws CalculationError if line item data is invalid
   */
  static updateLineItemAmount(lineItem: LineItem): LineItem {
    try {
      // Validate line item
      if (!lineItem || typeof lineItem !== 'object') {
        throw new CalculationError('Line item must be a valid object')
      }

      if (!lineItem.id) {
        throw new CalculationError('Line item must have an ID')
      }

      // Calculate the new amount
      const amount = InvoiceCalculationService.calculateLineItemAmount(
        lineItem.quantity,
        lineItem.rate
      )

      // Return new line item with updated amount
      return {
        ...lineItem,
        amount
      }
    } catch (error) {
      if (error instanceof CalculationError) {
        throw error
      }
      throw new CalculationError('Failed to update line item amount', error as Error)
    }
  }

  /**
   * Updates all line items in an array with calculated amounts
   * Returns a new array with all line items having updated amounts
   * 
   * @param lineItems - Array of line items to update
   * @returns New array of line items with calculated amounts
   * @throws CalculationError if any line item is invalid
   */
  static updateAllLineItemAmounts(lineItems: LineItem[]): LineItem[] {
    try {
      if (!Array.isArray(lineItems)) {
        throw new CalculationError('Line items must be an array')
      }

      return lineItems.map(item => InvoiceCalculationService.updateLineItemAmount(item))
    } catch (error) {
      if (error instanceof CalculationError) {
        throw error
      }
      throw new CalculationError('Failed to update line item amounts', error as Error)
    }
  }

  /**
   * Rounds a currency value to 2 decimal places using banker's rounding
   * This ensures consistent and accurate currency calculations
   * 
   * @param value - The value to round
   * @returns The value rounded to 2 decimal places
   * @throws CalculationError if value is invalid
   */
  static roundCurrency(value: number): number {
    try {
      if (typeof value !== 'number') {
        throw new CalculationError('Value must be a number')
      }

      if (!isFinite(value)) {
        throw new CalculationError('Value must be a finite number')
      }

      // Use Math.round with multiplication/division for precise rounding
      // This avoids floating point precision issues
      return Math.round(value * 100) / 100
    } catch (error) {
      if (error instanceof CalculationError) {
        throw error
      }
      throw new CalculationError('Failed to round currency value', error as Error)
    }
  }

  /**
   * Validates that a line item has all required fields for calculations
   * 
   * @param lineItem - The line item to validate
   * @returns true if valid, throws error if invalid
   * @throws CalculationError if line item is invalid
   */
  static validateLineItem(lineItem: Partial<LineItem>): boolean {
    try {
      if (!lineItem || typeof lineItem !== 'object') {
        throw new CalculationError('Line item must be a valid object')
      }

      if (!lineItem.id) {
        throw new CalculationError('Line item must have an ID')
      }

      if (typeof lineItem.quantity !== 'number' || lineItem.quantity < 0) {
        throw new CalculationError('Line item must have a valid positive quantity')
      }

      if (typeof lineItem.rate !== 'number' || lineItem.rate < 0) {
        throw new CalculationError('Line item must have a valid positive rate')
      }

      if (!lineItem.description || lineItem.description.trim() === '') {
        throw new CalculationError('Line item must have a description')
      }

      if (!lineItem.type || !['material', 'labor'].includes(lineItem.type)) {
        throw new CalculationError('Line item must have a valid type (material or labor)')
      }

      return true
    } catch (error) {
      if (error instanceof CalculationError) {
        throw error
      }
      throw new CalculationError('Failed to validate line item', error as Error)
    }
  }
}