import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { PaymentQr } from './PaymentQr'
const encode = vi.hoisted(() => vi.fn())
vi.mock('../../../utils/paymentQr', () => ({ paymentQrDataUrl: encode }))
beforeEach(() => vi.resetAllMocks())
it('removes an old destination immediately and ignores its late encoder result', async () => {
  let first: (value: string) => void = () => {}
  let second: (value: string) => void = () => {}
  encode
    .mockImplementationOnce(
      () =>
        new Promise<string>(resolve => {
          first = resolve
        })
    )
    .mockImplementationOnce(
      () =>
        new Promise<string>(resolve => {
          second = resolve
        })
    )
  const { rerender } = render(<PaymentQr url="https://rzp.io/i/first" />)
  rerender(<PaymentQr url="https://rzp.io/i/second" />)
  await act(async () => first('data:image/png;base64,OLD'))
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  await act(async () => second('data:image/png;base64,NEW'))
  expect(screen.getByRole('img')).toHaveAttribute(
    'src',
    'data:image/png;base64,NEW'
  )
  expect(screen.getByRole('link')).toHaveAttribute(
    'href',
    'https://rzp.io/i/second'
  )
})
it('hides a completed old QR before its replacement is ready', async () => {
  encode
    .mockResolvedValueOnce('data:image/png;base64,OLD')
    .mockImplementationOnce(() => new Promise(() => {}))
  const { rerender } = render(<PaymentQr url="https://rzp.io/i/first" />)
  await screen.findByRole('img')
  rerender(<PaymentQr url="https://rzp.io/i/second" />)
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Preparing')
})
it('shows an actionable encoder error and permits retry', async () => {
  encode
    .mockRejectedValueOnce(new Error('canvas unavailable'))
    .mockResolvedValueOnce('data:image/png;base64,OK')
  render(<PaymentQr url="https://rzp.io/i/retry" />)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Use the payment link'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Retry QR' }))
  await waitFor(() =>
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'data:image/png;base64,OK'
    )
  )
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
