import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders draft status correctly', () => {
    render(<StatusBadge status="draft" />)
    
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('aria-label', 'Status: Draft')
    expect(badge).toHaveTextContent('Draft')
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-700')
  })

  it('renders sent status correctly', () => {
    render(<StatusBadge status="sent" />)
    
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('aria-label', 'Status: Sent')
    expect(badge).toHaveTextContent('Sent')
    expect(badge).toHaveClass('bg-primary-100', 'text-primary-700')
  })

  it('renders paid status correctly', () => {
    render(<StatusBadge status="paid" />)
    
    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('aria-label', 'Status: Paid')
    expect(badge).toHaveTextContent('Paid')
    expect(badge).toHaveClass('bg-success-100', 'text-success-700')
  })

  it('includes colored dot indicator', () => {
    render(<StatusBadge status="paid" />)
    
    const badge = screen.getByRole('status')
    const dot = badge.querySelector('span[aria-hidden="true"]')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass('w-1.5', 'h-1.5', 'rounded-full', 'bg-success-500')
  })

  it('applies custom className', () => {
    render(<StatusBadge status="draft" className="custom-class" />)
    
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('custom-class')
  })

  it('forwards additional props', () => {
    render(<StatusBadge status="sent" data-testid="custom-badge" />)
    
    const badge = screen.getByTestId('custom-badge')
    expect(badge).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<StatusBadge status="paid" />)
    
    const badge = screen.getByRole('status')
    expect(badge).toHaveAttribute('role', 'status')
    expect(badge).toHaveAttribute('aria-label', 'Status: Paid')
    
    const dot = badge.querySelector('span[aria-hidden="true"]')
    expect(dot).toHaveAttribute('aria-hidden', 'true')
  })

  it('has consistent styling structure', () => {
    render(<StatusBadge status="draft" />)
    
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass(
      'inline-flex',
      'items-center',
      'space-x-1.5',
      'px-3',
      'py-1.5',
      'rounded-full',
      'text-xs',
      'font-semibold',
      'transition-all',
      'duration-200'
    )
  })
})