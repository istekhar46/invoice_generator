import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GuestInvoiceData } from '../../../types/guest'
import { guestDocument } from '../../../utils/invoiceDocument'
import { QuickInvoiceBuilder } from './QuickInvoiceBuilder'

const {
  clearLocalStorage,
  mutateAsync,
  generateAndDownloadPDF,
  saveToLocalStorage,
  downloadInvoicePDF,
  catalogQuery,
  stockQuery,
} = vi.hoisted(() => ({
  clearLocalStorage: vi.fn(),
  mutateAsync: vi.fn(),
  generateAndDownloadPDF: vi.fn(),
  saveToLocalStorage: vi.fn(),
  downloadInvoicePDF: vi.fn(),
  catalogQuery: vi.fn(),
  stockQuery: vi.fn(),
}))

vi.mock('../../../hooks/useInvoices', () => ({
  useUpdateInvoice: () => ({ mutateAsync, isPending: false, error: null }),
  useCreateQuickInvoice: () => ({
    mutateAsync,
    isPending: false,
    error: null,
  }),
}))

vi.mock('../../../utils/guestPDFGeneration', () => ({
  generateAndDownloadPDF,
}))

vi.mock('../../../services/pdf/pdfGenerator.service', () => ({
  downloadInvoicePDF,
}))

vi.mock('../../../utils/guestInvoiceStorage', () => ({
  clearLocalStorage,
  saveToLocalStorage,
}))

vi.mock('../../../hooks/useCatalog', () => ({ useCatalog: catalogQuery }))
vi.mock('../../../hooks/useInventory', () => ({
  useStockAvailability: stockQuery,
}))

describe('QuickInvoiceBuilder guest mode', () => {
  const originalWidth = window.innerWidth
  const guestDraft: GuestInvoiceData = {
    draftId: 'guest-draft-1',
    company: { businessName: 'Guest Company' },
    customer: { name: 'Guest Customer' },
    invoiceDetails: {
      serviceDate: new Date('2026-10-01'),
      dueDate: new Date('2026-10-31'),
      taxRate: 0.125,
    },
    lineItems: [
      {
        id: 'item-1',
        type: 'product',
        description: 'Consulting',
        unit: 'hour',
        quantity: 2,
        rate: 100,
        amount: 200,
      },
    ],
    notes: '',
    createdAt: new Date('2026-10-01'),
    lastModified: new Date('2026-10-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.innerWidth = 1024
    stockQuery.mockReturnValue({ data: [], isPending: false })
    catalogQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'logo',
            type: 'product',
            name: 'Logo',
            description: '',
            unit: 'PCS',
            rate: 3000,
            currency: 'INR',
          },
        ],
      },
    })
    generateAndDownloadPDF.mockResolvedValue(undefined)
    mutateAsync.mockResolvedValue({
      id: 'invoice-1',
      invoiceNumber: 'INV-1',
      customer: null,
      serviceDate: new Date('2026-10-01'),
      dueDate: new Date('2026-10-31'),
      subtotal: 200,
      taxRate: 0.125,
      taxAmount: 25,
      total: 225,
      status: 'DRAFT',
      lineItems: [
        {
          id: 'line-item-1',
          type: 'PRODUCT',
          description: 'Consulting',
          unit: 'hour',
          quantity: 2,
          rate: 100,
          amount: 200,
        },
      ],
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    })
  })

  afterEach(() => {
    window.innerWidth = originalWidth
  })

  it('adds only confirmed guest items to the invoice, local draft and PDF', async () => {
    render(<QuickInvoiceBuilder mode="guest" />)
    expect(screen.getByText('No line items yet')).toBeInTheDocument()
    expect(screen.queryByLabelText('Item description')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Add from catalog' })
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Bill to *'), {
      target: { value: 'Customer' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
    fireEvent.change(screen.getByLabelText('Item description'), {
      target: { value: 'Design work' },
    })
    fireEvent.change(screen.getByLabelText('Item unit'), {
      target: { value: 'hour' },
    })
    fireEvent.change(screen.getByLabelText('Item quantity'), {
      target: { value: '0' },
    })
    fireEvent.change(screen.getByLabelText('Item rate'), {
      target: { value: '100' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
    expect(
      screen.getByText('Quantity must be greater than 0')
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Subtotal')).toHaveTextContent('$0.00')
    fireEvent.change(screen.getByLabelText('Item quantity'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
    expect(screen.queryByLabelText('Item description')).not.toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '2 hour' })).toBeInTheDocument()
    expect(screen.getByLabelText('Subtotal')).toHaveTextContent('$200.00')
    await waitFor(() =>
      expect(saveToLocalStorage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          lineItems: [
            expect.objectContaining({
              description: 'Design work',
              quantity: 2,
            }),
          ],
        })
      )
    )
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    await waitFor(() => expect(generateAndDownloadPDF).toHaveBeenCalledOnce())
    expect(generateAndDownloadPDF.mock.calls[0][0].lineItems).toEqual([
      expect.objectContaining({
        description: 'Design work',
        quantity: 2,
        rate: 100,
      }),
    ])
    fireEvent.click(screen.getByTitle('Delete Line Item'))
    expect(screen.getByText('No line items yet')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    await screen.findByText('At least one line item is required')
    expect(generateAndDownloadPDF).toHaveBeenCalledOnce()
    expect(mutateAsync).not.toHaveBeenCalled()
    expect(catalogQuery).not.toHaveBeenCalled()
    expect(stockQuery).not.toHaveBeenCalled()
  })

  it('confirms the catalog quantity before adding and saving an account invoice', async () => {
    mutateAsync.mockImplementationOnce(() => new Promise(() => {}))
    render(<QuickInvoiceBuilder initialDefaults={initialDefaults} />)
    fireEvent.change(screen.getByLabelText('Bill to *'), {
      target: { value: 'Customer' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add from catalog' }))
    fireEvent.click(screen.getByRole('button', { name: /Logo/ }))
    expect(screen.getByLabelText('Item quantity')).toHaveValue(1)
    expect(screen.getByLabelText('Subtotal')).toHaveTextContent('0.00')
    fireEvent.change(screen.getByLabelText('Item quantity'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
    expect(screen.getByRole('cell', { name: '2 PCS' })).toBeInTheDocument()
    expect(screen.getByLabelText('Subtotal')).toHaveTextContent('6,000.00')
    fireEvent.click(screen.getByRole('button', { name: 'Save Invoice' }))
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          lineItems: [
            expect.objectContaining({
              catalogItemId: 'logo',
              type: 'PRODUCT',
              quantity: 2,
              unit: 'PCS',
              rate: 3000,
            }),
          ],
        })
      )
    )
  })

  it('cancels mobile additions and commits fractional quantities and edits through the item dialog', async () => {
    const user = userEvent.setup()
    window.innerWidth = 390
    render(<QuickInvoiceBuilder mode="guest" initialGuestData={guestDraft} />)
    await user.click(screen.getByRole('button', { name: 'Add Item' }))
    expect(
      screen.getByRole('dialog', { name: 'Add Line Item' })
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Item description'), {
      target: { value: 'Unconfirmed' },
    })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Unconfirmed')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Subtotal')).toHaveTextContent('$200.00')
    await user.click(screen.getByTitle('Edit Line Item'))
    expect(
      await screen.findByRole('dialog', { name: 'Edit Line Item' })
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Item quantity'), {
      target: { value: '1.250' },
    })
    await user.click(screen.getByRole('button', { name: 'Update Item' }))
    expect(screen.getByRole('cell', { name: '1.25 hour' })).toBeInTheDocument()
    expect(screen.getByLabelText('Subtotal')).toHaveTextContent('$125.00')
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    await waitFor(() => expect(generateAndDownloadPDF).toHaveBeenCalledOnce())
    expect(generateAndDownloadPDF.mock.calls[0][0].lineItems).toEqual([
      expect.objectContaining({ description: 'Consulting', quantity: 1.25 }),
    ])
  })

  it('downloads locally and never calls the authenticated invoice API', async () => {
    const user = userEvent.setup()
    const onSignUp = vi.fn()

    render(
      <QuickInvoiceBuilder
        mode="guest"
        initialGuestData={guestDraft}
        onSignUp={onSignUp}
      />
    )

    const download = await screen.findByRole('button', { name: 'Download PDF' })
    await waitFor(() => expect(download).toBeEnabled())
    expect(
      screen.queryByRole('button', { name: 'Save Invoice' })
    ).not.toBeInTheDocument()

    await user.click(download)

    await waitFor(() => expect(generateAndDownloadPDF).toHaveBeenCalledOnce())
    expect(mutateAsync).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Sign Up to Save' }))
    expect(saveToLocalStorage).toHaveBeenCalled()
    expect(onSignUp).toHaveBeenCalledOnce()
  })

  it('keeps guest paid editing local, labels imported openings, and locks paid/currency on saved account invoices', async () => {
    const imported = {
      ...guestDraft,
      invoiceDetails: { ...guestDraft.invoiceDetails, amountPaid: 25.5 },
    }
    const guest = render(
      <QuickInvoiceBuilder mode="guest" initialGuestData={imported} />
    )
    expect(screen.getByLabelText('Amount paid (USD)')).not.toHaveAttribute(
      'readonly'
    )
    guest.unmount()
    const account = render(
      <QuickInvoiceBuilder initialGuestData={imported} autoSaveImportedDraft />
    )
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          importedGuestDraft: true,
          amountPaid: 25.5,
          clientRequestId: guestDraft.draftId,
        })
      )
    )
    expect(screen.getByLabelText('Amount paid (USD)')).toHaveAttribute(
      'readonly'
    )
    account.unmount()
    render(
      <QuickInvoiceBuilder
        invoice={{
          ...guestDocument(imported, 'PAID-SNAPSHOT'),
          hasPaymentHistory: true,
        }}
      />
    )
    expect(screen.getByLabelText('Currency')).toBeDisabled()
    expect(screen.getByLabelText('Amount paid (USD)')).toHaveAttribute(
      'readonly'
    )
  })

  it('preserves legacy saved totals in the live editor and PDF until pricing changes', async () => {
    const draft = {
      ...guestDraft,
      invoiceDetails: { ...guestDraft.invoiceDetails, taxRate: 0 },
      lineItems: [1, 2].map(index => ({
        ...guestDraft.lineItems[0],
        id: `line-${index}`,
        quantity: 1,
        rate: 0.335,
        amount: 0.335,
      })),
    }
    const original = {
      ...guestDocument(draft, 'LEGACY-1'),
      subtotal: 0.67,
      taxAmount: 0,
      total: 0.67,
      lineItems: draft.lineItems.map(item => ({
        ...item,
        invoiceId: 'legacy',
      })),
    }
    render(<QuickInvoiceBuilder invoice={original} />)
    expect(screen.getByLabelText('Invoice total')).toHaveTextContent('$0.67')
    fireEvent.click(screen.getAllByTitle('Edit Line Item')[0])
    fireEvent.change(screen.getByLabelText('Item description'), {
      target: { value: 'Revised description' },
    })
    fireEvent.click(screen.getByTitle('Save Changes'))
    expect(screen.getByLabelText('Invoice total')).toHaveTextContent('$0.67')
    await userEvent.type(screen.getByLabelText('Notes'), 'Changed details')
    await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    await waitFor(() => expect(downloadInvoicePDF).toHaveBeenCalledOnce())
    expect(downloadInvoicePDF.mock.calls[0][0]).toMatchObject({
      total: 0.67,
      notes: 'Changed details',
      lineItems: [{ amount: 0.335 }, { amount: 0.335 }],
    })
    fireEvent.change(screen.getByLabelText('Tax (%)'), {
      target: { value: '10' },
    })
    expect(screen.getByLabelText('Invoice total')).toHaveTextContent('$0.75')
  })

  it('automatically saves an imported guest draft after authentication', async () => {
    render(
      <QuickInvoiceBuilder
        initialGuestData={guestDraft}
        autoSaveImportedDraft
      />
    )

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce())
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ clientRequestId: guestDraft.draftId })
    )
    expect(clearLocalStorage).toHaveBeenCalledOnce()
  })

  const initialDefaults = {
    settings: {
      currency: 'INR',
      taxRate: 0,
      paymentTerms: 'Net 14',
      notes: 'Standard note',
      terms: 'Bank transfer',
    },
    company: {
      id: 'company',
      userId: 'account',
      businessName: 'Profile Company',
      address: 'Profile address',
      city: 'Mumbai',
      state: 'MH',
      zipCode: '400001',
      email: 'company@example.test',
      phone: '1234567890',
      defaultTaxRate: 0.1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    logoDataUrl: 'data:image/png;base64,aGVsbG8=',
  }
  it('prefills a fresh invoice and saves only preferences without requiring customer/items', async () => {
    const onSaveDefaults = vi.fn().mockResolvedValue(initialDefaults.settings)
    render(
      <QuickInvoiceBuilder
        initialDefaults={initialDefaults}
        onSaveDefaults={onSaveDefaults}
      />
    )
    expect(screen.getByLabelText('From')).toHaveValue('Profile Company')
    expect(screen.getByLabelText('Bill to *')).toHaveValue('')
    expect(screen.getByLabelText('Currency')).toHaveValue('INR')
    expect(screen.getByLabelText('Tax (%)')).toHaveValue(0)
    expect(screen.getByLabelText('Notes')).toHaveValue('Standard note')
    expect(screen.getByLabelText('Invoice number')).toHaveValue('')
    await userEvent.click(
      screen.getByRole('button', { name: 'Save as default' })
    )
    await waitFor(() =>
      expect(onSaveDefaults).toHaveBeenCalledWith(initialDefaults.settings)
    )
    expect(mutateAsync).not.toHaveBeenCalled()
  })
  it('retains a restored draft and existing invoice even when account defaults differ', () => {
    const view = render(
      <QuickInvoiceBuilder
        initialGuestData={guestDraft}
        initialDefaults={initialDefaults}
      />
    )
    expect(screen.getByLabelText('From')).toHaveValue('Guest Company')
    expect(screen.getByLabelText('Currency')).toHaveValue('USD')
    expect(screen.getByLabelText('Notes')).toHaveValue('')
    expect(
      screen.queryByRole('img', { name: 'Company logo' })
    ).not.toBeInTheDocument()
    view.unmount()
    render(
      <QuickInvoiceBuilder
        invoice={guestDocument(guestDraft, 'EXISTING-1')}
        initialDefaults={initialDefaults}
      />
    )
    expect(screen.getByLabelText('Invoice number')).toHaveValue('EXISTING-1')
    expect(screen.getByLabelText('Tax (%)')).toHaveValue(12.5)
    expect(screen.getByLabelText('Currency')).toHaveValue('USD')
  })
  it('shows a defaults save failure without clearing invoice values', async () => {
    render(
      <QuickInvoiceBuilder
        initialDefaults={initialDefaults}
        onSaveDefaults={vi
          .fn()
          .mockRejectedValue(new Error('Defaults save failed'))}
      />
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Save as default' })
    )
    await screen.findByText('Defaults save failed')
    expect(screen.getByLabelText('Notes')).toHaveValue('Standard note')
    expect(clearLocalStorage).not.toHaveBeenCalled()
  })

  it('clears the saved draft and resets the complete guest form', async () => {
    const user = userEvent.setup()

    render(<QuickInvoiceBuilder mode="guest" initialGuestData={guestDraft} />)

    expect(
      await screen.findByRole('textbox', { name: 'Bill to *' })
    ).toHaveValue('Guest Customer')
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
    fireEvent.change(screen.getByLabelText('Item description'), {
      target: { value: 'Unconfirmed item' },
    })
    await user.click(screen.getByRole('button', { name: 'Clear Draft' }))

    expect(clearLocalStorage).toHaveBeenCalledOnce()
    expect(screen.getByRole('textbox', { name: 'Bill to *' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'From' })).toHaveValue('')
    expect(screen.queryByLabelText('Item description')).not.toBeInTheDocument()
    expect(screen.getByText('No line items yet')).toBeInTheDocument()

    saveToLocalStorage.mockClear()
    await new Promise(resolve => setTimeout(resolve, 600))
    expect(saveToLocalStorage).not.toHaveBeenCalled()

    await user.type(
      screen.getByRole('textbox', { name: 'From' }),
      'New Company'
    )
    await waitFor(() => expect(saveToLocalStorage).toHaveBeenCalledOnce(), {
      timeout: 1000,
    })
  })
  it('submits the guest form as a download and never saves through the API', async () => {
    render(<QuickInvoiceBuilder mode="guest" initialGuestData={guestDraft} />)
    fireEvent.submit(
      screen.getByRole('button', { name: 'Download PDF' }).closest('form')!
    )
    await waitFor(() => expect(generateAndDownloadPDF).toHaveBeenCalledOnce())
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('rejects an overpayment before PDF generation and preserves the editable draft', async () => {
    const user = userEvent.setup()
    render(<QuickInvoiceBuilder mode="guest" initialGuestData={guestDraft} />)
    const paid = screen.getByLabelText('Amount paid (USD)')
    await user.clear(paid)
    await user.type(paid, '1000')
    await user.click(screen.getByRole('button', { name: 'Download PDF' }))
    await waitFor(() =>
      expect(
        screen.getAllByText('Amount paid cannot exceed the invoice total.')
          .length
      ).toBeGreaterThan(0)
    )
    expect(generateAndDownloadPDF).not.toHaveBeenCalled()
    expect(clearLocalStorage).not.toHaveBeenCalled()
    expect(paid).toHaveValue(1000)
  })

  it('keeps the draft when PDF generation fails and reports the error', async () => {
    generateAndDownloadPDF.mockRejectedValueOnce(
      new Error('PDF generation failed')
    )
    render(<QuickInvoiceBuilder mode="guest" initialGuestData={guestDraft} />)
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    await screen.findByText('PDF generation failed')
    expect(saveToLocalStorage).toHaveBeenCalled()
    expect(clearLocalStorage).not.toHaveBeenCalled()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('downloads with a visible warning when browser draft storage fails', async () => {
    saveToLocalStorage.mockImplementationOnce(() => {
      throw new Error('Storage full')
    })
    render(<QuickInvoiceBuilder mode="guest" initialGuestData={guestDraft} />)
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    await waitFor(() => expect(generateAndDownloadPDF).toHaveBeenCalledOnce())
    expect(
      screen.getByText(
        'The PDF can be downloaded, but this browser could not save your draft.'
      )
    ).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })
})
