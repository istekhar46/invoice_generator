import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-gradient-primary') // primary variant with gradient
  })

  it('renders different variants', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-white', 'border-2', 'border-gray-200')

    rerender(<Button variant="success">Success</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gradient-success')

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gradient-danger')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-transparent')
  })

  it('renders different sizes with proper touch targets', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('min-h-[36px]')

    rerender(<Button size="md">Medium</Button>)
    expect(screen.getByRole('button')).toHaveClass('min-h-[44px]') // Touch-friendly

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('min-h-[52px]')
  })

  it('has modern styling with rounded corners and shadows', () => {
    render(<Button>Modern Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('rounded-xl', 'shadow-soft')
  })

  it('has press effect and transitions', () => {
    render(<Button>Press me</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('active:scale-95', 'transition-all', 'duration-200')
  })

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('supports backward compatibility with old size and variant values', () => {
    const { rerender } = render(<Button size="small" variant="outline">Old Props</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('min-h-[36px]') // small -> sm
    expect(button).toHaveClass('bg-white', 'border-2', 'border-gray-200') // outline -> secondary styling

    rerender(<Button size="medium">Medium Old</Button>)
    expect(screen.getByRole('button')).toHaveClass('min-h-[44px]') // medium -> md

    rerender(<Button size="large">Large Old</Button>)
    expect(screen.getByRole('button')).toHaveClass('min-h-[52px]') // large -> lg
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })
})