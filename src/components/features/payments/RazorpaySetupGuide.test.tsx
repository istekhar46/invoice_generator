import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RazorpaySetupGuide } from './RazorpaySetupGuide'
import type { RazorpaySetupConnection } from '../../../types/razorpay'

const mocks = vi.hoisted(() => ({
  env: { API_BASE_URL: 'https://api.example.invalid/api/v1' },
  write: vi.fn(),
}))
vi.mock('../../../utils/env', () => ({ ENV: mocks.env }))
const connection: RazorpaySetupConnection = {
  id: 'test-connection',
  mode: 'TEST',
  enabled: true,
  maskedKeyId: 'rzp_test_…1234',
  validatedAt: '2026-11-05T00:00:00Z',
  updatedAt: '2026-11-05T00:00:00Z',
  hasWebhookSecret: true,
  webhookPath: '/api/v1/razorpay/webhooks/test-connection',
  lastWebhook: null,
}
const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard'
)
beforeEach(() => {
  vi.clearAllMocks()
  mocks.env.API_BASE_URL = 'https://api.example.invalid/api/v1'
  mocks.write.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: mocks.write },
  })
})
afterEach(() => {
  if (originalClipboard)
    Object.defineProperty(navigator, 'clipboard', originalClipboard)
  else Reflect.deleteProperty(navigator, 'clipboard')
})

it('copies the full configured backend endpoint without duplicating the API prefix', async () => {
  render(<RazorpaySetupGuide mode="TEST" connection={connection} />)
  const url =
    'https://api.example.invalid/api/v1/razorpay/webhooks/test-connection'
  expect(screen.getByLabelText('Test webhook URL')).toHaveValue(url)
  expect(screen.getByLabelText('Test webhook URL')).toHaveAttribute('readonly')
  fireEvent.click(screen.getByRole('button', { name: 'Copy Test webhook URL' }))
  await screen.findByText('Webhook URL copied.')
  expect(mocks.write).toHaveBeenCalledWith(url)
  expect(screen.getByText(/No signed webhook received yet/)).toBeInTheDocument()
  expect(
    screen.queryByText('Last signed webhook received')
  ).not.toBeInTheDocument()
})

it('keeps receipt evidence separate from webhook configuration and payment confirmation', () => {
  render(
    <RazorpaySetupGuide
      mode="TEST"
      connection={{
        ...connection,
        lastWebhook: {
          receivedAt: '2026-11-05T08:00:00Z',
          event: 'unhandled.event',
          outcome: 'IGNORED',
        },
      }}
    />
  )
  expect(screen.getByText('Last signed webhook received')).toBeInTheDocument()
  expect(screen.getByText('unhandled.event')).toBeInTheDocument()
  expect(document.querySelector('time')).toHaveAttribute(
    'datetime',
    '2026-11-05T08:00:00Z'
  )
  expect(
    screen.getByText('Received without invoice changes.')
  ).toBeInTheDocument()
  expect(
    screen.getByText(/does not verify every event setting/)
  ).toBeInTheDocument()
})

it('labels a synced callback as processed without claiming money was settled', () => {
  render(
    <RazorpaySetupGuide
      mode="LIVE"
      connection={{
        ...connection,
        mode: 'LIVE',
        lastWebhook: {
          receivedAt: '2026-11-05T08:00:00Z',
          event: 'payment_link.cancelled',
          outcome: 'SYNCED',
        },
      }}
    />
  )
  expect(screen.getByText('Processed for a payment link.')).toBeInTheDocument()
  expect(screen.getByLabelText('Live webhook URL')).toBeInTheDocument()
})

it('shows pending steps for an unconnected account without inventing an endpoint', () => {
  render(<RazorpaySetupGuide mode="LIVE" />)
  expect(screen.getAllByText(/— Pending/)).toHaveLength(3)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('keeps the API connection step pending when saved credentials are disabled', () => {
  render(
    <RazorpaySetupGuide
      mode="TEST"
      connection={{ ...connection, enabled: false }}
    />
  )
  expect(screen.getByText('Connect API keys').closest('li')).toHaveTextContent(
    'Pending'
  )
  expect(screen.getByText(/Saved keys are disabled/)).toBeInTheDocument()
})

it('keeps manual copy available if the browser denies clipboard access', async () => {
  mocks.write.mockRejectedValueOnce(new Error('Clipboard blocked'))
  render(<RazorpaySetupGuide mode="TEST" connection={connection} />)
  fireEvent.click(screen.getByRole('button', { name: 'Copy Test webhook URL' }))
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent(
      'Copy the webhook URL from the field above.'
    )
  )
  expect(screen.getByLabelText('Test webhook URL')).toHaveValue(
    'https://api.example.invalid/api/v1/razorpay/webhooks/test-connection'
  )
})

it.each(['http://localhost:8000/api/v1', 'https://127.0.0.1/api/v1'])(
  'does not offer %s as a public webhook URL',
  base => {
    mocks.env.API_BASE_URL = base
    render(<RazorpaySetupGuide mode="TEST" connection={connection} />)
    expect(
      screen.getByRole('button', { name: 'Copy Test webhook URL' })
    ).toBeDisabled()
    expect(
      screen.getByText(/Razorpay needs a public HTTPS endpoint/)
    ).toBeInTheDocument()
    expect(mocks.write).not.toHaveBeenCalled()
  }
)
