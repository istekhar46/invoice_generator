import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Header, type HeaderProps } from './Header'

const user = { displayName: 'Alex Taylor', email: 'alex@example.com' }
function renderHeader(props: HeaderProps = {}) {
  return render(
    <MemoryRouter>
      <Header {...props} />
    </MemoryRouter>
  )
}

describe('Account header', () => {
  it('links the brand to the public homepage for guests without console controls', () => {
    renderHeader()
    expect(
      screen.getByRole('img', { name: 'Invoiceo home' }).closest('a')
    ).toHaveAttribute('href', '/')
    expect(
      screen.queryByRole('button', { name: 'Open menu' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Logout' })
    ).not.toBeInTheDocument()
  })

  it('links the brand to the dashboard for signed-in users and delegates menu control', () => {
    const onMenuToggle = vi.fn()
    renderHeader({ user, onMenuToggle, isMobileMenuOpen: true })
    expect(
      screen.getByRole('img', { name: 'Invoiceo home' }).closest('a')
    ).toHaveAttribute('href', '/dashboard')
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-controls', 'console-navigation')
    fireEvent.click(toggle)
    expect(onMenuToggle).toHaveBeenCalledOnce()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('delegates logout and shows progress without allowing repeated logout', () => {
    const onLogout = vi.fn()
    const { rerender } = renderHeader({ user, onLogout })
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    expect(onLogout).toHaveBeenCalledOnce()
    rerender(
      <MemoryRouter>
        <Header user={user} isLoading />
      </MemoryRouter>
    )
    expect(screen.getByRole('status')).toHaveTextContent('Signing out...')
    expect(
      screen.queryByRole('button', { name: 'Logout' })
    ).not.toBeInTheDocument()
  })
})
