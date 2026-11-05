import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { DirectUpiSettings } from './DirectUpiSettings'
const api = vi.hoisted(() => ({
  preferences: vi.fn(),
  savePreferences: vi.fn(),
  removePreferences: vi.fn(),
}))
vi.mock('../../../services/api/directUpiApi', () => ({ directUpiApi: api }))
vi.mock('../../../hooks/useAuth', () => ({
  useUserProfile: () => ({ data: { id: 'upi-owner' } }),
}))
const saved = { upiId: 'demo@bank', payeeName: 'Demo Store' }
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DirectUpiSettings />
      </MemoryRouter>
    </QueryClientProvider>
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  api.preferences.mockResolvedValue(null)
})
it('does not submit invalid receiving details', async () => {
  mount()
  await screen.findByRole('button', { name: 'Save UPI details' })
  fireEvent.change(screen.getByLabelText('Receiving UPI ID'), {
    target: { value: 'demo@bank&am=1' },
  })
  fireEvent.change(screen.getByLabelText('UPI payee name'), {
    target: { value: 'Demo' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save UPI details' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a UPI ID')
  expect(api.savePreferences).not.toHaveBeenCalled()
})
it('saves trimmed details, refetches and confirms success without claiming bank verification', async () => {
  api.savePreferences.mockImplementation(async () => {
    api.preferences.mockResolvedValue(saved)
    return saved
  })
  mount()
  await screen.findByRole('button', { name: 'Save UPI details' })
  fireEvent.change(screen.getByLabelText('Receiving UPI ID'), {
    target: { value: ' demo@bank ' },
  })
  fireEvent.change(screen.getByLabelText('UPI payee name'), {
    target: { value: ' Demo Store ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save UPI details' }))
  await screen.findByText('UPI details saved.')
  expect(api.savePreferences).toHaveBeenCalledExactlyOnceWith(saved)
  await screen.findByRole('button', { name: 'Remove saved UPI details' })
  expect(screen.getByText(/checks the format only/)).toBeInTheDocument()
})
it('keeps the saved details on a failed update and supports removing preferences', async () => {
  api.preferences.mockResolvedValue(saved)
  api.savePreferences.mockRejectedValue(
    new Error('Could not update receiving details')
  )
  api.removePreferences.mockImplementation(async () => {
    api.preferences.mockResolvedValue(null)
    return { removed: true }
  })
  mount()
  await screen.findByRole('button', { name: 'Remove saved UPI details' })
  fireEvent.click(screen.getByRole('button', { name: 'Save UPI details' }))
  await screen.findByText('Could not update receiving details')
  expect(screen.getByLabelText('Receiving UPI ID')).toHaveValue(saved.upiId)
  fireEvent.click(
    screen.getByRole('button', { name: 'Remove saved UPI details' })
  )
  await waitFor(() =>
    expect(screen.getByLabelText('Receiving UPI ID')).toHaveValue('')
  )
  expect(api.removePreferences).toHaveBeenCalledOnce()
})
it('offers retry for a failed preference read without an editable stale form', async () => {
  api.preferences.mockRejectedValue(new Error('Read unavailable'))
  mount()
  await screen.findByText('Read unavailable')
  expect(screen.queryByLabelText('Receiving UPI ID')).not.toBeInTheDocument()
  api.preferences.mockResolvedValue(saved)
  fireEvent.click(screen.getByRole('button', { name: 'Retry UPI settings' }))
  await screen.findByLabelText('Receiving UPI ID')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
