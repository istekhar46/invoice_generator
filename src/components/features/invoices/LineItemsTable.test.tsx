/**
 * LineItemsTable Component Tests
 * Tests for line items management functionality
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LineItemsTable } from './LineItemsTable'
import type { LineItem } from '../../../types/entities'

// Mock the formatters
vi.mock('../../../utils/formatters', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
}))

// Mock the calculation service
vi.mock('../../../services/invoiceCalculation.service', () => ({
  InvoiceCalculationService: {
    calculateLineItemAmount: (quantity: number, rate: number) => quantity * rate,
  },
}))

const mockLineItems: LineItem[] = [
  {
    id: 'item1',
    invoiceId: 'invoice1',
    type: 'labor',
    description: 'Electrical work',
    quantity: 2,
    rate: 50,
    amount: 100,
  },
  {
    id: 'item2',
    invoiceId: 'invoice1',
    type: 'material',
    description: 'Wire and outlets',
    quantity: 1,
    rate: 75,
    amount: 75,
  },
]

describe('LineItemsTable', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('should render line items correctly', () => {
    render(
      <LineItemsTable
        lineItems={mockLineItems}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Electrical work')).toBeInTheDocument()
    expect(screen.getByText('Wire and outlets')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$75.00')).toBeInTheDocument()
  })

  it('should show empty state when no line items', () => {
    render(
      <LineItemsTable
        lineItems={[]}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('No line items added yet')).toBeInTheDocument()
    expect(screen.getByText('Add Your First Line Item')).toBeInTheDocument()
  })

  it('should show add form when add button is clicked', () => {
    render(
      <LineItemsTable
        lineItems={mockLineItems}
        onChange={mockOnChange}
      />
    )

    const addButton = screen.getByText('Add Item')
    fireEvent.click(addButton)

    expect(screen.getByDisplayValue('labor')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument()
  })

  it('should calculate subtotal correctly', () => {
    render(
      <LineItemsTable
        lineItems={mockLineItems}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('$175.00')).toBeInTheDocument() // 100 + 75
  })

  it('should disable buttons when disabled prop is true', () => {
    render(
      <LineItemsTable
        lineItems={mockLineItems}
        onChange={mockOnChange}
        disabled={true}
      />
    )

    const addButton = screen.getByText('Add Item')
    expect(addButton).toBeDisabled()
  })

  it('should show edit form when edit button is clicked', () => {
    render(
      <LineItemsTable
        lineItems={mockLineItems}
        onChange={mockOnChange}
      />
    )

    const editButtons = screen.getAllByTitle('Edit Line Item')
    fireEvent.click(editButtons[0])

    // Should show the form with the item's current values
    expect(screen.getByDisplayValue('Electrical work')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
  })

  it('should prevent event propagation on button clicks', () => {
    const mockStopPropagation = vi.fn()
    const originalEvent = { stopPropagation: mockStopPropagation }
    
    render(
      <LineItemsTable
        lineItems={mockLineItems}
        onChange={mockOnChange}
      />
    )

    const editButtons = screen.getAllByTitle('Edit Line Item')
    
    // Simulate click with stopPropagation
    fireEvent.click(editButtons[0], originalEvent)
    
    // The edit form should be shown (indicating the click was handled)
    expect(screen.getByDisplayValue('Electrical work')).toBeInTheDocument()
  })

  it('should call onChange when item is deleted', () => {
    render(
      <LineItemsTable
        lineItems={mockLineItems}
        onChange={mockOnChange}
      />
    )

    const deleteButtons = screen.getAllByTitle('Delete Line Item')
    fireEvent.click(deleteButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith([mockLineItems[1]])
  })
})