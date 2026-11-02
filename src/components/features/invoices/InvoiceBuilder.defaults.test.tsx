import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InvoiceBuilder } from './InvoiceBuilder'

const { save, invoiceSave, settings, download } = vi.hoisted(() => ({
  save: vi.fn().mockResolvedValue({}),
  invoiceSave: vi.fn(),
  download: vi.fn().mockResolvedValue(undefined),
  settings: {
    currency: 'KWD',
    taxRate: 0,
    paymentTerms: 'Net 14',
    notes: 'Standard notes',
    terms: 'Bank transfer',
  },
}))
vi.mock('../../../hooks/usePDFGeneration', () => ({
  usePDFGeneration: () => ({
    downloadInvoicePDFDirect: download,
    isGenerating: false,
  }),
}))
vi.mock('../../../hooks/useInvoiceDefaults', () => ({
  useSaveInvoiceDefaults: () => ({ mutateAsync: save }),
  useNewInvoiceDefaults: () => ({ data: { settings }, isPending: false }),
}))
vi.mock('../../../hooks/useCompany', () => ({
  useCompanyProfile: () => ({ data: { defaultTaxRate: 0.2 } }),
}))
vi.mock('../../../hooks/useInvoices', () => ({
  useCreateInvoice: () => ({ mutateAsync: invoiceSave }),
  useUpdateInvoice: () => ({ mutateAsync: invoiceSave }),
}))
const customer = {
  id: 'client',
  userId: 'user',
  name: 'Client',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('Standard invoice defaults', () => {
  it('downloads the current review snapshot through the PDF service', async () => {
    const invoice = {
      id: 'pdf',
      userId: 'user',
      customerId: customer.id,
      customer,
      invoiceNumber: 'PDF-1',
      currency: 'EUR',
      notes: 'Invoice note',
      paymentTerms: 'Net 7',
      taxRate: 0.1,
      taxAmount: 1,
      subtotal: 10,
      total: 11,
      status: 'draft' as const,
      lineItems: [
        {
          id: 'line',
          invoiceId: 'pdf',
          type: 'product' as const,
          description: 'Service',
          quantity: 1,
          rate: 10,
          amount: 10,
          unit: 'each',
        },
      ],
      serviceDate: new Date(),
      dueDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    render(<InvoiceBuilder invoice={invoice} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    await waitFor(() =>
      expect(download).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'EUR',
          notes: 'Invoice note',
          paymentTerms: 'Net 7',
          total: 11,
        }),
        customer,
        expect.anything()
      )
    )
  })
  it('uses saved settings including zero tax and saves defaults without submitting an invoice', async () => {
    render(<InvoiceBuilder initialCustomer={customer} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByLabelText('Currency')).toHaveValue('KWD')
    expect(screen.getByLabelText('Tax Rate (%) *')).toHaveValue('0')
    expect(screen.getByLabelText('Payment terms')).toHaveValue('Net 14')
    expect(
      screen.getByPlaceholderText(/add any additional notes/i)
    ).toHaveValue('Standard notes')
    fireEvent.click(screen.getByRole('button', { name: 'Save as default' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith(settings))
    expect(invoiceSave).not.toHaveBeenCalled()
  })
  it('retains the existing invoice currency and notes when account defaults differ', async () => {
    const invoice = {
      id: 'old',
      userId: 'user',
      customerId: customer.id,
      customer,
      invoiceNumber: 'OLD-1',
      currency: 'EUR',
      notes: '',
      taxRate: 0.1,
      taxAmount: 1,
      subtotal: 10,
      total: 11,
      status: 'draft' as const,
      lineItems: [],
      serviceDate: new Date(),
      dueDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    render(<InvoiceBuilder invoice={invoice} />)
    expect(screen.getByLabelText('Currency')).toHaveValue('EUR')
    expect(screen.getByLabelText('Tax Rate (%) *')).toHaveValue('10')
    expect(
      screen.getByPlaceholderText(/add any additional notes/i)
    ).toHaveValue('')
    expect(screen.getByLabelText('Payment terms')).toHaveValue('')
  })
})
