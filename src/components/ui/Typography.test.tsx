import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { 
  Typography, 
  Heading1, 
  Heading2, 
  Heading3, 
  BodyText, 
  Caption,
  Link
} from './Typography'

describe('Typography Component', () => {
  it('renders with default variant and element', () => {
    render(<Typography>Default text</Typography>)
    const element = screen.getByText('Default text')
    expect(element.tagName).toBe('P')
    expect(element).toHaveClass('text-body')
  })

  it('renders with specified variant', () => {
    render(<Typography variant="heading-1">Heading text</Typography>)
    const element = screen.getByText('Heading text')
    expect(element.tagName).toBe('H1')
    // Check for responsive classes instead of custom class
    expect(element.className).toContain('text-3xl')
    expect(element.className).toContain('sm:text-4xl')
    expect(element.className).toContain('lg:text-5xl')
  })

  it('renders with custom element', () => {
    render(<Typography as="span" variant="caption">Caption text</Typography>)
    const element = screen.getByText('Caption text')
    expect(element.tagName).toBe('SPAN')
    expect(element).toHaveClass('text-caption')
  })

  it('applies touch target class when specified', () => {
    render(<Typography touchTarget>Touch target text</Typography>)
    const element = screen.getByText('Touch target text')
    expect(element).toHaveClass('min-h-[44px]')
    expect(element).toHaveClass('min-w-[44px]')
  })

  it('applies text balance when specified', () => {
    render(<Typography balance>Balanced text</Typography>)
    const element = screen.getByText('Balanced text')
    expect(element).toHaveClass('text-balance')
  })

  it('applies text pretty when specified', () => {
    render(<Typography pretty>Pretty text</Typography>)
    const element = screen.getByText('Pretty text')
    expect(element).toHaveClass('text-pretty')
  })

  it('applies custom className', () => {
    render(<Typography className="custom-class">Custom text</Typography>)
    const element = screen.getByText('Custom text')
    expect(element).toHaveClass('custom-class')
    expect(element).toHaveClass('text-body')
  })
})

describe('Typography Convenience Components', () => {
  it('renders Heading1 with correct variant', () => {
    render(<Heading1>Heading 1</Heading1>)
    const element = screen.getByText('Heading 1')
    expect(element.tagName).toBe('H1')
    expect(element.className).toContain('text-3xl')
    expect(element.className).toContain('sm:text-4xl')
    expect(element.className).toContain('lg:text-5xl')
  })

  it('renders Heading2 with correct variant', () => {
    render(<Heading2>Heading 2</Heading2>)
    const element = screen.getByText('Heading 2')
    expect(element.tagName).toBe('H2')
    expect(element.className).toContain('text-2xl')
    expect(element.className).toContain('sm:text-3xl')
    expect(element.className).toContain('lg:text-4xl')
  })

  it('renders Heading3 with correct variant', () => {
    render(<Heading3>Heading 3</Heading3>)
    const element = screen.getByText('Heading 3')
    expect(element.tagName).toBe('H3')
    expect(element.className).toContain('text-xl')
    expect(element.className).toContain('sm:text-2xl')
    expect(element.className).toContain('lg:text-3xl')
  })

  it('renders BodyText with correct variant', () => {
    render(<BodyText>Body text</BodyText>)
    const element = screen.getByText('Body text')
    expect(element.tagName).toBe('P')
    expect(element).toHaveClass('text-body')
  })

  it('renders Caption with correct variant', () => {
    render(<Caption>Caption text</Caption>)
    const element = screen.getByText('Caption text')
    expect(element.tagName).toBe('SPAN')
    expect(element).toHaveClass('text-caption')
  })

  it('renders Link with correct variant', () => {
    render(<Link>Link text</Link>)
    const element = screen.getByText('Link text')
    expect(element.tagName).toBe('A')
    expect(element).toHaveClass('text-link')
  })
})

describe('Typography Responsive Behavior', () => {
  it('applies responsive classes for heading variants', () => {
    render(<Typography variant="heading-1">Responsive heading</Typography>)
    const element = screen.getByText('Responsive heading')
    
    // Should have responsive classes for different breakpoints
    expect(element.className).toContain('text-3xl')
    expect(element.className).toContain('sm:text-4xl')
    expect(element.className).toContain('lg:text-5xl')
  })

  it('does not apply responsive classes for non-heading variants', () => {
    render(<Typography variant="body">Body text</Typography>)
    const element = screen.getByText('Body text')
    
    // Should only have the base class
    expect(element).toHaveClass('text-body')
    expect(element.className).not.toContain('sm:')
    expect(element.className).not.toContain('lg:')
  })
})

describe('Typography Accessibility', () => {
  it('maintains semantic HTML structure', () => {
    const { container } = render(
      <div>
        <Heading1>Main Title</Heading1>
        <Heading2>Section Title</Heading2>
        <BodyText>Paragraph content</BodyText>
        <Caption>Small caption</Caption>
      </div>
    )

    expect(container.querySelector('h1')).toBeInTheDocument()
    expect(container.querySelector('h2')).toBeInTheDocument()
    expect(container.querySelector('p')).toBeInTheDocument()
    expect(container.querySelector('span')).toBeInTheDocument()
  })

  it('supports custom accessibility attributes', () => {
    render(
      <Typography 
        variant="heading-1" 
        aria-label="Custom heading"
      >
        Accessible heading
      </Typography>
    )
    
    const element = screen.getByText('Accessible heading')
    expect(element).toHaveAttribute('aria-label', 'Custom heading')
  })
})