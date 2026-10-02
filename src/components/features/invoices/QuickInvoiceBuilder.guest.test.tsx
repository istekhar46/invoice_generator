import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GuestInvoiceData } from '../../../types/guest'
import { QuickInvoiceBuilder } from './QuickInvoiceBuilder'

const { clearLocalStorage, mutateAsync, generateAndDownloadPDF, saveToLocalStorage } = vi.hoisted(() => ({
  clearLocalStorage: vi.fn(),
  mutateAsync: vi.fn(),
  generateAndDownloadPDF: vi.fn(),
  saveToLocalStorage: vi.fn(),
}))

vi.mock('../../../hooks/useInvoices', () => ({
  useCreateQuickInvoice: () => ({
    mutateAsync,
    isPending: false,
    error: null,
  }),
}))

vi.mock('../../../utils/guestPDFGeneration', () => ({
  generateAndDownloadPDF,
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
    lineItems: [{
      id: 'item-1',
      type: 'material',
      description: 'Consulting',
      unit: 'hour',
      quantity: 2,
      rate: 100,
      amount: 200,
    }],
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
      lineItems: [{
        id: 'line-item-1',
        type: 'MATERIAL',
        description: 'Consulting',
        unit: 'hour',
        quantity: 2,
        rate: 100,
        amount: 200,
      }],
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
    expect(screen.queryByRole('button', { name: 'Save Invoice' })).not.toBeInTheDocument()

    await user.click(download)

    await waitFor(() => expect(generateAndDownloadPDF).toHaveBeenCalledOnce())
    expect(mutateAsync).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Sign Up to Save' }))
    expect(saveToLocalStorage).toHaveBeenCalled()
    expect(onSignUp).toHaveBeenCalledOnce()
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

    render(
      <QuickInvoiceBuilder
        mode="guest"
        initialGuestData={guestDraft}
      />
    )

    expect(await screen.findByText('Guest Customer')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear Draft' }))

    expect(clearLocalStorage).toHaveBeenCalledOnce()
    expect(screen.queryByText('Guest Customer')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your Company Information' })).toBeInTheDocument()

    saveToLocalStorage.mockClear()
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(saveToLocalStorage).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox', { name: 'Business Name' }), 'New Company')
    await waitFor(() => expect(saveToLocalStorage).toHaveBeenCalledOnce(), { timeout: 1000 })
  })
})
