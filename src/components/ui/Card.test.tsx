import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders with default props', () => {
    render(<Card>Card content</Card>)
    const card = screen.getByText('Card content')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('rounded-2xl', 'shadow-soft', 'bg-white', 'p-6')
  })

  it('renders with different padding options', () => {
    const { rerender } = render(<Card padding="none">No padding</Card>)
    expect(screen.getByText('No padding')).not.toHaveClass('p-4', 'p-6', 'p-8')

    rerender(<Card padding="sm">Small padding</Card>)
    expect(screen.getByText('Small padding')).toHaveClass('p-4')

    rerender(<Card padding="lg">Large padding</Card>)
    expect(screen.getByText('Large padding')).toHaveClass('p-8')
  })

  it('applies hover effects when hover prop is true', () => {
    render(<Card hover>Hoverable card</Card>)
    const card = screen.getByText('Hoverable card')
    expect(card).toHaveClass('hover:shadow-medium', 'hover:-translate-y-1', 'transition-all', 'duration-300')
  })

  it('applies glass morphism styling when glassMorphism prop is true', () => {
    render(<Card glassMorphism>Glass card</Card>)
    const card = screen.getByText('Glass card')
    expect(card).toHaveClass('glass-morphism')
    expect(card).not.toHaveClass('bg-white', 'border-gray-200')
  })

  it('has fade-in animation', () => {
    render(<Card>Animated card</Card>)
    const card = screen.getByText('Animated card')
    expect(card).toHaveClass('animate-fade-in')
  })

  it('forwards additional props and className', () => {
    render(
      <Card className="custom-class" data-testid="custom-card">
        Custom card
      </Card>
    )
    const card = screen.getByTestId('custom-card')
    expect(card).toHaveClass('custom-class')
    expect(card).toHaveAttribute('data-testid', 'custom-card')
  })
})