import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { InvoiceSharePanel } from './InvoiceSharePanel'
import { invoicePdfFixtures } from '../../../test/fixtures/invoicePdfs'
const api = vi.hoisted(() => ({
  status: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
}))
vi.mock('../../../services/api/invoiceSharingApi', () => ({
  invoiceSharingApi: api,
}))
const invoice = invoicePdfFixtures[0].invoice
beforeEach(() => {
  vi.clearAllMocks()
  api.status.mockResolvedValue({
    available: true,
    active: false,
    canCreate: true,
    createdAt: null,
  })
  api.create.mockResolvedValue({
    token: 'fake.signature.token',
    createdAt: '2026-11-05T00:00:00.000Z',
  })
  api.revoke.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})
it('creates only on an explicit copy action, reuses it on later copy, and requires revocation confirmation', async () => {
  render(<InvoiceSharePanel invoice={invoice} />)
  fireEvent.click(
    await screen.findByRole('button', { name: 'Create & copy invoice link' })
  )
  await screen.findByText('Invoice link copied.')
  expect(api.create).toHaveBeenCalledExactlyOnceWith(invoice.id, true)
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
    `${window.location.origin}/shared/invoice#fake.signature.token`
  )
  fireEvent.click(screen.getByRole('button', { name: 'Copy invoice link' }))
  await screen.findByText('Invoice link copied.')
  expect(api.create).toHaveBeenLastCalledWith(invoice.id, false)
  fireEvent.click(screen.getByRole('button', { name: 'Revoke invoice link' }))
  expect(api.revoke).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm revocation' }))
  await screen.findByText('Invoice link revoked.')
  expect(api.revoke).toHaveBeenCalledExactlyOnceWith(invoice.id)
  expect(screen.queryByLabelText('Public invoice link')).not.toBeInTheDocument()
})
it('offers manual copy after clipboard denial, without claiming success', async () => {
  vi.mocked(navigator.clipboard.writeText).mockRejectedValue(
    new Error('Denied')
  )
  render(<InvoiceSharePanel invoice={invoice} />)
  fireEvent.click(
    await screen.findByRole('button', { name: 'Create & copy invoice link' })
  )
  expect(await screen.findByLabelText('Public invoice link')).toHaveValue(
    `${window.location.origin}/shared/invoice#fake.signature.token`
  )
  expect(screen.queryByText('Invoice link copied.')).not.toBeInTheDocument()
})
it('keeps drafts private without fetching or creating a share', () => {
  render(<InvoiceSharePanel invoice={{ ...invoice, status: 'draft' }} />)
  expect(api.status).not.toHaveBeenCalled()
  expect(api.create).not.toHaveBeenCalled()
})
it('offers explicit retry for status failures and does not expose premature create controls', async () => {
  api.status.mockRejectedValueOnce(new Error('Unavailable'))
  render(<InvoiceSharePanel invoice={invoice} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable')
  expect(
    screen.queryByRole('button', { name: 'Create & copy invoice link' })
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry sharing' }))
  await screen.findByRole('button', { name: 'Create & copy invoice link' })
})
it('allows revocation with missing signing configuration, without offering create/copy', async () => {
  api.status.mockResolvedValue({
    available: false,
    active: true,
    canCreate: true,
  })
  render(<InvoiceSharePanel invoice={invoice} />)
  await screen.findByRole('button', { name: 'Revoke invoice link' })
  expect(
    screen.queryByRole('button', { name: 'Copy invoice link' })
  ).not.toBeInTheDocument()
})
