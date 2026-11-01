import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GuestInvoiceData } from '../../../types/guest'
import { guestDocument } from '../../../utils/invoiceDocument'
import { QuickInvoiceBuilder } from './QuickInvoiceBuilder'

const {
  clearLocalStorage,
  mutateAsync,
  generateAndDownloadPDF,
  saveToLocalStorage,
  downloadInvoicePDF,
} = vi.hoisted(() => ({
  clearLocalStorage: vi.fn(),
  mutateAsync: vi.fn(),
  generateAndDownloadPDF: vi.fn(),
  saveToLocalStorage: vi.fn(),
  downloadInvoicePDF: vi.fn(),
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

describe('QuickInvoiceBuilder guest mode', () => {
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
        type: 'material',
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
          type: 'MATERIAL',
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

  it('clears the saved draft and resets the complete guest form', async () => {
    const user = userEvent.setup()

    render(<QuickInvoiceBuilder mode="guest" initialGuestData={guestDraft} />)

    expect(
      await screen.findByRole('textbox', { name: 'Bill to *' })
    ).toHaveValue('Guest Customer')
    await user.click(screen.getByRole('button', { name: 'Clear Draft' }))

    expect(clearLocalStorage).toHaveBeenCalledOnce()
    expect(screen.getByRole('textbox', { name: 'Bill to *' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'From' })).toHaveValue('')

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
