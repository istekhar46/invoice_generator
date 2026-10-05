import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Header } from './Header'

const user = { displayName: 'Alex Taylor', email: 'alex@example.com' }

function renderHeader() {
  return render(<MemoryRouter initialEntries={['/invoices']}><Header user={user} /></MemoryRouter>)
}

describe('Mobile workspace navigation', () => {
  it('announces its state, shows the active route, and restores focus on Escape', () => {
    renderHeader()
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const navigation = screen.getByRole('navigation', { name: 'Mobile navigation' })
    const invoices = within(navigation).getByRole('link', { name: /Invoices/ })
    expect(invoices).toHaveAttribute('aria-current', 'page')
    invoices.focus()
    fireEvent.keyDown(invoices, { key: 'Escape' })
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
    expect(toggle).toHaveFocus()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes when the backdrop is pressed and restores focus', () => {
    renderHeader()
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation backdrop' }))
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
    expect(toggle).toHaveFocus()
  })

  it('closes after choosing a destination', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const navigation = screen.getByRole('navigation', { name: 'Mobile navigation' })
    fireEvent.click(within(navigation).getByRole('link', { name: /Customers/ }))
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
  })
})
