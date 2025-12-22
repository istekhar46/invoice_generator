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

  it('renders with label', () => {
    render(<Input label="Email Address" />)
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<Input label="Email" error="Invalid email format" />)
    const input = screen.getByLabelText('Email')
    const errorMessage = screen.getByText('Invalid email format')
    
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveClass('border-red-500')
    expect(errorMessage).toBeInTheDocument()
    expect(errorMessage).toHaveAttribute('role', 'alert')
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

  it('supports different input types', () => {
    const { rerender } = render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" />)
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password')

    rerender(<Input type="tel" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel')
  })
})