import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text')
  })

  it('has modern styling with rounded corners and proper sizing', () => {
    render(<Input placeholder="Modern input" />)
    const input = screen.getByPlaceholderText('Modern input')
    expect(input).toHaveClass('rounded-xl', 'min-h-[44px]', 'px-4', 'py-3')
  })

  it('has proper focus states and transitions', () => {
    render(<Input placeholder="Focus me" />)
    const input = screen.getByPlaceholderText('Focus me')
    expect(input).toHaveClass(
      'focus:ring-2', 
      'focus:ring-primary-500', 
      'focus:border-transparent',
      'transition-all',
      'duration-200'
    )
  })

  it('has touch-friendly sizing', () => {
    render(<Input placeholder="Touch friendly" />)
    const input = screen.getByPlaceholderText('Touch friendly')
    expect(input).toHaveClass('touch-target', 'min-h-[44px]')
  })

  it('renders with label', () => {
    render(<Input label="Email Address" />)
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
  })

  it('shows error message with danger styling', () => {
    render(<Input label="Email" error="Invalid email format" />)
    const input = screen.getByLabelText('Email')
    const errorMessage = screen.getByText('Invalid email format')
    
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveClass('border-danger-500', 'focus:ring-danger-500')
    expect(errorMessage).toBeInTheDocument()
    expect(errorMessage).toHaveAttribute('role', 'alert')
    expect(errorMessage).toHaveClass('text-danger-600')
  })

  it('shows help text when no error', () => {
    render(<Input label="Password" helpText="Must be at least 8 characters" />)
    expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument()
  })

  it('prioritizes error over help text', () => {
    render(
      <Input
        label="Password"
        helpText="Must be at least 8 characters"
        error="Password is required"
      />
    )
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(screen.queryByText('Must be at least 8 characters')).not.toBeInTheDocument()
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    
    render(<Input onChange={handleChange} />)
    const input = screen.getByRole('textbox')
    
    await user.type(input, 'test input')
    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('test input')
  })

  it('supports different input types with mobile optimization', () => {
    const { rerender } = render(<Input type="email" />)
    const emailInput = screen.getByRole('textbox')
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('inputMode', 'email')

    rerender(<Input type="tel" />)
    const telInput = screen.getByRole('textbox')
    expect(telInput).toHaveAttribute('type', 'tel')
    expect(telInput).toHaveAttribute('inputMode', 'tel')

    rerender(<Input type="number" />)
    const numberInput = screen.getByRole('spinbutton')
    expect(numberInput).toHaveAttribute('type', 'number')
    expect(numberInput).toHaveAttribute('inputMode', 'numeric')
  })
})