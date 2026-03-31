/**
 * InvoiceBuilder Component Tests
 * Tests for invoice update functionality including button validation,
 * line item editing, and form submission
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Invoice, Customer } from '../../../types/entities'

// Setup mock functions
const mockCreateInvoiceMutate = vi.fn()
const mockUpdateInvoiceMutate = vi.fn().mockResolvedValue({
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

// Mock the hooks
vi.mock('../../../hooks/useInvoices', () => ({
  useCreateInvoice: vi.fn(() => ({
    mutateAsync: mockCreateInvoiceMutate,
    isPending: false,
    error: null,
  })),
  useUpdateInvoice: vi.fn(() => ({
    mutateAsync: mockUpdateInvoiceMutate,
    isPending: false,
    error: null,
  })),
}))

vi.mock('../../../hooks/useCompany', () => ({
  useCompanyProfile: vi.fn(() => ({
    data: {
      id: 'company-1',
      name: 'Test Company',
      defaultTaxRate: 0.08,
    },
  })),
}))

vi.mock('../../../hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.mock('../../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => ({
    isOnline: true,
  })),
}))

// Mock CustomerList component
vi.mock('../customers/CustomerList', () => ({
  CustomerList: ({ onCustomerSelect }: any) => (
    <div data-testid="customer-list">
      <button onClick={() => onCustomerSelect({
        id: 'test-customer-id',
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '555-1234',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
      })}>
        Select Customer
      </button>
    </div>
  ),
}))

// Mock LineItemsTable component
vi.mock('./LineItemsTable', () => ({
  LineItemsTable: ({ lineItems, onChange }: any) => (
    <div data-testid="line-items-table">
      <div>Line Items: {lineItems.length}</div>
      {lineItems.map((item: any) => (
        <div key={item.id} data-testid={`line-item-${item.id}`}>
          {item.description}
        </div>
      ))}
      <button onClick={() => onChange([...lineItems, {
        id: 'new-item',
        type: 'material',
        description: 'New Item',
        unit: 'pcs',
        quantity: 1,
        rate: 10,
        amount: 10,
      }])}>
        Add Item
      </button>
    </div>
  ),
}))

// Mock InvoicePreview component
vi.mock('./InvoicePreview', () => ({
  InvoicePreview: () => <div data-testid="invoice-preview">Invoice Preview</div>,
}))

// Mock the transformers
vi.mock('../../../utils/apiTransformers', () => ({
  transformLineItemToDto: (item: any) => ({
    type: item.type.toUpperCase(),
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    rate: item.rate,
  }),
  transformInvoiceResponse: (dto: any) => ({
    ...dto,
    status: dto.status.toLowerCase(),
    lineItems: dto.lineItems.map((item: any) => ({
      ...item,
      type: item.type.toLowerCase(),
    })),
  }),
}))

// Import after mocks
import { InvoiceBuilder } from './InvoiceBuilder'

// Test data
const mockCustomer: Customer = {
  id: 'test-customer-id',
  userId: 'test-user-id',
  name: 'Test Customer',
  email: 'test@example.com',
  phone: '555-1234',
  address: '123 Test St',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockInvoice: Invoice = {
  id: 'test-invoice-id',
  userId: 'test-user-id',
  invoiceNumber: 'INV-001',
  customerId: 'test-customer-id',
  serviceDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-15'),
  subtotal: 100,
  taxRate: 0.08,
  taxAmount: 8,
  total: 108,
  notes: 'Test notes',
  status: 'draft',
  lineItems: [
    {
      id: 'item-1',
      invoiceId: 'test-invoice-id',
      type: 'material',
      description: 'Test Material',
      unit: 'bundle',
      quantity: 5,
      rate: 20,
      amount: 100,
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Helper to render component with providers
const renderInvoiceBuilder = (props: any = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <InvoiceBuilder {...props} />
    </QueryClientProvider>
  )
}

describe('InvoiceBuilder - Update Invoice Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State for Editing', () => {
    it('should load existing invoice data when invoice prop is provided', () => {
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Should skip to details step when editing
      expect(screen.getByText('Invoice Details')).toBeInTheDocument()
    })

    it('should populate form fields with existing invoice data', () => {
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Check if notes are populated
      const notesField = screen.getByPlaceholderText(/add any additional notes/i)
      expect(notesField).toHaveValue('Test notes')
    })

    it('should display existing line items', () => {
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Navigate to items step
      const nextButton = screen.getByRole('button', { name: /next/i })
      userEvent.click(nextButton)

      waitFor(() => {
        expect(screen.getByText('Test Material')).toBeInTheDocument()
      })
    })
  })

  describe('Button Validation - Details Step', () => {
    it('should enable Next button when all details are valid', async () => {
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      const nextButton = screen.getByRole('button', { name: /next/i })
      
      // Button should be enabled with valid data
      await waitFor(() => {
        expect(nextButton).not.toBeDisabled()
      })
    })

    it('should disable Next button when due date is before service date', async () => {
      const user = userEvent.setup()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Find and update due date to be before service date
      const dueDateInput = screen.getByLabelText(/due date/i)
      await user.clear(dueDateInput)
      await user.type(dueDateInput, '2024-01-01') // Before service date (2024-01-15)

      const nextButton = screen.getByRole('button', { name: /next/i })
      
      await waitFor(() => {
        expect(nextButton).toBeDisabled()
      })

      // Should show error message
      expect(screen.getByText(/due date must be on or after service date/i)).toBeInTheDocument()
    })

    it('should enable Next button when dates are corrected', async () => {
      const user = userEvent.setup()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Set invalid date first
      const dueDateInput = screen.getByLabelText(/due date/i)
      await user.clear(dueDateInput)
      await user.type(dueDateInput, '2024-01-01')

      // Verify button is disabled
      const nextButton = screen.getByRole('button', { name: /next/i })
      await waitFor(() => {
        expect(nextButton).toBeDisabled()
      })

      // Correct the date
      await user.clear(dueDateInput)
      await user.type(dueDateInput, '2024-02-15')

      // Button should be enabled now
      await waitFor(() => {
        expect(nextButton).not.toBeDisabled()
      })
    })
  })

  describe('Button Validation - Line Items Step', () => {
    it('should enable Next button when line items are valid', async () => {
      const user = userEvent.setup()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Navigate to items step
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Line Items')).toBeInTheDocument()
      })

      // Next button should be enabled with existing line items
      await waitFor(() => {
        expect(nextButton).not.toBeDisabled()
      })
    })

    it('should keep Next button enabled after editing line item description', async () => {
      const user = userEvent.setup()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Navigate to items step
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Line Items')).toBeInTheDocument()
      })

      // Click edit button on the line item
      const editButton = screen.getByTitle(/edit line item/i)
      await user.click(editButton)

      // Wait for edit form to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument()
      })

      // Edit the description
      const descriptionInput = screen.getByPlaceholderText(/description/i)
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated Material Description')

      // Save the changes
      const saveButton = screen.getByTitle(/save changes/i)
      await user.click(saveButton)

      // Next button should still be enabled
      nextButton = screen.getByRole('button', { name: /next/i })
      await waitFor(() => {
        expect(nextButton).not.toBeDisabled()
      })
    })

    it('should keep Next button enabled after changing line item type', async () => {
      const user = userEvent.setup()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Navigate to items step
      let nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Line Items')).toBeInTheDocument()
      })

      // Click edit button
      const editButton = screen.getByTitle(/edit line item/i)
      await user.click(editButton)

      // Change type from material to labor
      const typeSelect = screen.getByRole('combobox')
      await user.selectOptions(typeSelect, 'labor')

      // Save changes
      const saveButton = screen.getByTitle(/save changes/i)
      await user.click(saveButton)

      // Next button should be enabled
      nextButton = screen.getByRole('button', { name: /next/i })
      await waitFor(() => {
        expect(nextButton).not.toBeDisabled()
      })
    })

    it('should disable Next button when line item has empty description', async () => {
      const user = userEvent.setup()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Navigate to items step
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Line Items')).toBeInTheDocument()
      })

      // Edit line item
      const editButton = screen.getByTitle(/edit line item/i)
      await user.click(editButton)

      // Clear description
      const descriptionInput = screen.getByPlaceholderText(/description/i)
      await user.clear(descriptionInput)

      // Try to save (should show validation error)
      const saveButton = screen.getByTitle(/save changes/i)
      await user.click(saveButton)

      // Should show error and not save
      await waitFor(() => {
        expect(screen.getByText(/description is required/i)).toBeInTheDocument()
      })
    })

    it('should disable Next button when line item has invalid quantity', async () => {
      const user = userEvent.setup()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Navigate to items step
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Line Items')).toBeInTheDocument()
      })

      // Edit line item
      const editButton = screen.getByTitle(/edit line item/i)
      await user.click(editButton)

      // Set invalid quantity
      const quantityInput = screen.getByPlaceholderText('0')
      await user.clear(quantityInput)
      await user.type(quantityInput, '0')

      // Try to save
      const saveButton = screen.getByTitle(/save changes/i)
      await user.click(saveButton)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/quantity must be a positive number/i)).toBeInTheDocument()
      })
    })
  })

  describe('Button Validation - Review Step', () => {
    it('should enable Update Invoice button when all steps are valid', async () => {
      const user = userEvent.setup()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Navigate through all steps to review
      const nextButton = screen.getByRole('button', { name: /next/i })
      
      // Details -> Items
      await user.click(nextButton)
      await waitFor(() => {
        expect(screen.getByText('Line Items')).toBeInTheDocument()
      })

      // Items -> Review
      await user.click(nextButton)
      await waitFor(() => {
        expect(screen.getByText('Review & Save')).toBeInTheDocument()
      })

      // Update button should be enabled
      const updateButton = screen.getByRole('button', { name: /update invoice/i })
      await waitFor(() => {
        expect(updateButton).not.toBeDisabled()
      })
    })

    it('should disable Update Invoice button after successful submission', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer, onSave })

      // Navigate to review step
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Review & Save')).toBeInTheDocument()
      })

      // Click update button
      const updateButton = screen.getByRole('button', { name: /update invoice/i })
      await user.click(updateButton)

      // Button should be disabled after submission
      await waitFor(() => {
        expect(updateButton).toBeDisabled()
      })

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/invoice updated successfully/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSave callback with transformed invoice data', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer, onSave })

      // Navigate to review and submit
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)

      const updateButton = screen.getByRole('button', { name: /update invoice/i })
      await user.click(updateButton)

      // Wait for onSave to be called
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled()
      }, { timeout: 2000 })

      // Verify the data passed to onSave
      const savedInvoice = onSave.mock.calls[0][0]
      expect(savedInvoice).toHaveProperty('id')
      expect(savedInvoice).toHaveProperty('invoiceNumber')
      expect(savedInvoice.status).toBe('draft') // Should be lowercase
    })

    it('should display error message when update fails', async () => {
      const user = userEvent.setup()
      
      // Mock update to fail
      vi.mock('../../../hooks/useInvoices', () => ({
        useUpdateInvoice: () => ({
          mutateAsync: vi.fn().mockRejectedValue({
            status: 400,
            data: { message: 'Validation failed' },
          }),
          isPending: false,
          error: null,
        }),
      }))

      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Navigate to review and submit
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      await user.click(nextButton)

      const updateButton = screen.getByRole('button', { name: /update invoice/i })
      await user.click(updateButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/validation error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should allow navigating back to previous steps', async () => {
      const user = userEvent.setup()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Start at details step
      expect(screen.getByText('Invoice Details')).toBeInTheDocument()

      // Go to items step
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Line Items')).toBeInTheDocument()
      })

      // Go back to details
      const prevButton = screen.getByRole('button', { name: /previous/i })
      await user.click(prevButton)

      await waitFor(() => {
        expect(screen.getByText('Invoice Details')).toBeInTheDocument()
      })
    })

    it('should preserve form data when navigating between steps', async () => {
      const user = userEvent.setup()
      const invoiceWithCustomer = {
        ...mockInvoice,
        customer: mockCustomer,
      }

      renderInvoiceBuilder({ invoice: invoiceWithCustomer })

      // Update notes in details step
      const notesField = screen.getByPlaceholderText(/add any additional notes/i)
      await user.clear(notesField)
      await user.type(notesField, 'Modified notes')

      // Navigate to items step
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      // Navigate back to details
      const prevButton = screen.getByRole('button', { name: /previous/i })
      await user.click(prevButton)

      // Notes should still be there
      await waitFor(() => {
        expect(notesField).toHaveValue('Modified notes')
      })
    })
  })
})
