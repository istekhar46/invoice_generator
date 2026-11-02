import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import App from './App'

vi.mock('./services/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('./services/api/authApi')>(
    './services/api/authApi'
  )
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      refreshToken: vi.fn().mockRejectedValue(new Error('No active session')),
    },
  }
})

describe('App', () => {
  it('renders the public invoice homepage for a guest', async () => {
    render(<App />)
    expect(
      await screen.findByRole('heading', {
        name: 'Create Professional PDF Invoices Online.',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Start Invoicing for Free' })
    ).toHaveAttribute('href', '/signup')
  })

  it('makes the guest editor available without a session', async () => {
    render(<App />)
    expect(
      await screen.findByRole('region', { name: 'Free invoice generator' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'Save as default' })
    ).not.toBeInTheDocument()
  })
})
