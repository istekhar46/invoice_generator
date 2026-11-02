/**
 * LineItemsTable Component Tests
 * Tests for line items management functionality
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { LineItemsTable } from './LineItemsTable'
import type { LineItem } from '../../../types/entities'

const mockLineItems: LineItem[] = [
  {
    id: 'item1',
    invoiceId: 'invoice1',
    type: 'material',
    description: 'Electrical work',
    unit: 'mtr',
    quantity: 2,
    rate: 50,
    amount: 100,
  },
  {
    id: 'item2',
    invoiceId: 'invoice1',
    type: 'material',
    description: 'Wire and outlets',
    unit: 'bundle',
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
    render(<LineItemsTable lineItems={mockLineItems} onChange={mockOnChange} />)

    expect(screen.getByText('Electrical work')).toBeInTheDocument()
    expect(screen.getByText('Wire and outlets')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getAllByText('$75.00').length).toBeGreaterThan(0)
  })

  it('should show empty state when no line items', () => {
    render(<LineItemsTable lineItems={[]} onChange={mockOnChange} />)

    expect(screen.getByText('No line items yet')).toBeInTheDocument()
    expect(screen.getByText('Add Your First Line Item')).toBeInTheDocument()
  })

  it('should show add form when add button is clicked', () => {
    render(<LineItemsTable lineItems={mockLineItems} onChange={mockOnChange} />)

    const addButton = screen.getByRole('button', { name: 'Add Item' })
    fireEvent.click(addButton)

    expect(screen.getByPlaceholderText('Item name')).toBeInTheDocument()
  })

  it('should calculate subtotal correctly', () => {
    render(<LineItemsTable lineItems={mockLineItems} onChange={mockOnChange} />)

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

    const addButton = screen.getByRole('button', { name: 'Add Item' })
    expect(addButton).toBeDisabled()
  })

  it('should show edit form when edit button is clicked', () => {
    render(<LineItemsTable lineItems={mockLineItems} onChange={mockOnChange} />)

    const editButtons = screen.getAllByTitle('Edit Line Item')
    fireEvent.click(editButtons[0])

    // Should show the form with the item's current values
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByDisplayValue('Electrical work')).toBeInTheDocument()
    expect(dialog.getByDisplayValue('2')).toBeInTheDocument()
    expect(dialog.getByDisplayValue('50')).toBeInTheDocument()
  })

  it('prevents an edit click from reaching a parent invoice selection handler', () => {
    const onSelectInvoice = vi.fn()
    render(
      <div onClick={onSelectInvoice}>
        <LineItemsTable lineItems={mockLineItems} onChange={mockOnChange} />
      </div>
    )
    fireEvent.click(screen.getAllByTitle('Edit Line Item')[0])
    expect(onSelectInvoice).not.toHaveBeenCalled()
    expect(
      within(screen.getByRole('dialog')).getByDisplayValue('Electrical work')
    ).toBeInTheDocument()
  })

  it('should call onChange when item is deleted', () => {
    render(<LineItemsTable lineItems={mockLineItems} onChange={mockOnChange} />)

    const deleteButtons = screen.getAllByTitle('Delete Line Item')
    fireEvent.click(deleteButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith([mockLineItems[1]])
  })
})
