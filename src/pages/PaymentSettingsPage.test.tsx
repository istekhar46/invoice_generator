import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentSettingsPage } from './PaymentSettingsPage'

const mocks = vi.hoisted(() => ({
  owner: 'owner-a',
  list: vi.fn(),
  save: vi.fn(),
  verify: vi.fn(),
  disable: vi.fn(),
  webhook: vi.fn(),
}))
vi.mock('../hooks/useAuth', () => ({
  useUserProfile: () => ({ data: { id: mocks.owner } }),
}))
vi.mock('../services/api/razorpayApi', () => ({ razorpayApi: mocks }))
const saved = {
  id: 'connection-a',
  mode: 'TEST',
  enabled: true,
  maskedKeyId: 'rzp_test_…1234',
  validatedAt: '2026-11-04T00:00:00Z',
  updatedAt: '2026-11-04T00:00:00Z',
  hasWebhookSecret: false,
  webhookPath: '/api/v1/razorpay/webhooks/connection-a',
  lastWebhook: null,
}
const setup = { setupAvailable: true, connections: [] as object[] }
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PaymentSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return client
}
async function form(mode = 'Test') {
  return within(
    await screen.findByRole('region', { name: `${mode} Razorpay connection` })
  )
}
function fill(target: ReturnType<typeof within>, mode = 'Test') {
  fireEvent.change(target.getByRole('textbox', { name: `${mode} Key ID` }), {
    target: { value: `rzp_${mode.toLowerCase()}_Fictional1234` },
  })
  fireEvent.change(target.getByLabelText(`${mode} Key Secret`), {
    target: { value: 'private-secret' },
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.owner = 'owner-a'
  mocks.list.mockResolvedValue(setup)
  mocks.save.mockResolvedValue(saved)
  mocks.verify.mockResolvedValue(saved)
  mocks.disable.mockResolvedValue({ disabled: true })
  mocks.webhook.mockResolvedValue({ ...saved, hasWebhookSecret: true })
})
describe('Payment account setup', () => {
  it('refreshes signed receipt metadata using only the setup read', async () => {
    mocks.list.mockResolvedValue({ ...setup, connections: [saved] })
    mount()
    const target = await form()
    expect(
      target.getByText(/No signed webhook received yet/)
    ).toBeInTheDocument()
    mocks.list.mockResolvedValue({
      ...setup,
      connections: [
        {
          ...saved,
          hasWebhookSecret: true,
          lastWebhook: {
            receivedAt: '2026-11-05T08:00:00Z',
            event: 'payment.captured',
            outcome: 'SYNCED',
          },
        },
      ],
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh setup status' })
    )
    await target.findByText('Last signed webhook received')
    expect(mocks.save).not.toHaveBeenCalled()
    expect(mocks.verify).not.toHaveBeenCalled()
    expect(mocks.disable).not.toHaveBeenCalled()
    expect(mocks.webhook).not.toHaveBeenCalled()
  })
  it('saves the webhook secret outside query/mutation caches and clears the form', async () => {
    mocks.list.mockResolvedValue({ ...setup, connections: [saved] })
    const client = mount()
    const target = await form()
    fireEvent.change(target.getByLabelText('Test webhook secret'), {
      target: { value: 'fictional-webhook-secret' },
    })
    fireEvent.click(target.getByRole('button', { name: 'Save webhook secret' }))
    await target.findByText('Test webhook secret saved.')
    expect(mocks.webhook).toHaveBeenCalledWith(
      'TEST',
      'fictional-webhook-secret'
    )
    expect(target.getByLabelText('Test webhook secret')).toHaveValue('')
    expect(client.getMutationCache().getAll()).toHaveLength(0)
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map(query => query.state.data)
      )
    ).not.toContain('fictional-webhook-secret')
  })
  it('keeps test/live separate and stores no credential mutation or query data', async () => {
    const client = mount()
    const target = await form()
    fill(target)
    fireEvent.click(target.getByRole('button', { name: 'Verify & connect' }))
    await target.findByText('Test credentials verified and saved.')
    expect(mocks.save).toHaveBeenCalledWith('TEST', {
      keyId: 'rzp_test_Fictional1234',
      keySecret: 'private-secret',
    })
    expect(target.getByLabelText('Test Key Secret')).toHaveValue('')
    expect(client.getMutationCache().getAll()).toHaveLength(0)
    expect(
      JSON.stringify(client.getQueryData(['razorpay', 'owner-a']))
    ).not.toContain('private-secret')
    expect((await form('Live')).getByLabelText('Live Key Secret')).toHaveValue(
      ''
    )
  })
  it('rejects wrong-mode keys and spaces before sending', async () => {
    mount()
    const target = await form('Live')
    fill(target, 'Live')
    fireEvent.change(target.getByRole('textbox', { name: 'Live Key ID' }), {
      target: { value: 'rzp_test_Fictional' },
    })
    fireEvent.click(target.getByRole('button', { name: 'Verify & connect' }))
    expect(await target.findByRole('alert')).toHaveTextContent(
      'valid live API keys'
    )
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it('preserves entered credentials after failure and retries explicitly', async () => {
    mocks.save.mockRejectedValueOnce(new Error('Razorpay unavailable'))
    mount()
    const target = await form()
    fill(target)
    fireEvent.click(target.getByRole('button', { name: 'Verify & connect' }))
    expect(await target.findByRole('alert')).toHaveTextContent(
      'Razorpay unavailable'
    )
    await waitFor(() =>
      expect(
        target.getByRole('button', { name: 'Verify & connect' })
      ).toBeEnabled()
    )
    expect(target.getByLabelText('Test Key Secret')).toHaveValue(
      'private-secret'
    )
    fireEvent.click(target.getByRole('button', { name: 'Verify & connect' }))
    await target.findByText('Test credentials verified and saved.')
    expect(mocks.save).toHaveBeenCalledTimes(2)
  })
  it('disables form controls and duplicate submissions while verification is pending', async () => {
    let finish!: (value: unknown) => void
    mocks.save.mockReturnValue(
      new Promise(resolve => {
        finish = resolve
      })
    )
    mount()
    const target = await form()
    fill(target)
    const button = target.getByRole('button', { name: 'Verify & connect' })
    fireEvent.click(button)
    expect(target.getByLabelText('Test Key Secret')).toBeDisabled()
    fireEvent.click(button)
    expect(mocks.save).toHaveBeenCalledTimes(1)
    finish(saved)
    await target.findByText('Test credentials verified and saved.')
  })
  it('shows masked saved metadata and allows disable/reverify without returning a secret', async () => {
    mocks.list.mockResolvedValue({ ...setup, connections: [saved] })
    mount()
    const target = await form()
    expect(target.getByText('rzp_test_…1234')).toBeInTheDocument()
    expect(target.getByLabelText('Test Key Secret')).toHaveValue('')
    fireEvent.click(target.getByRole('button', { name: 'Disable connection' }))
    await target.findByText('Test connection disabled.')
    expect(mocks.disable).toHaveBeenCalledWith('TEST')
    fireEvent.click(
      target.getByRole('button', { name: 'Verify & enable saved keys' })
    )
    await target.findByText('Test connection verified and enabled.')
    expect(mocks.verify).toHaveBeenCalledWith('TEST')
  })
  it('disables setup if server encryption is not configured', async () => {
    mocks.list.mockResolvedValue({ ...setup, setupAvailable: false })
    mount()
    const target = await form()
    expect(
      target.getByRole('button', { name: 'Verify & connect' })
    ).toBeDisabled()
    expect(screen.getByText(/Contact the administrator/)).toBeInTheDocument()
  })
  it('shows a read failure with an explicit retry', async () => {
    mocks.list.mockRejectedValueOnce(new Error('Could not load settings'))
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load settings'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await form()
    expect(mocks.list).toHaveBeenCalledTimes(2)
  })
  it('scopes masked connection queries to the signed-in owner', async () => {
    mocks.owner = 'owner-b'
    const client = mount()
    await form()
    expect(client.getQueryData(['razorpay', 'owner-a'])).toBeUndefined()
    expect(client.getQueryData(['razorpay', 'owner-b'])).toEqual(setup)
  })
})
