import React from 'react'
import { cn } from '../../utils/classNames'
import { 
  type TypographyVariant, 
  typographyClasses, 
  getResponsiveTypographyClass,
  getTouchTargetClass 
} from '../../styles/typography'

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant
  as?: React.ElementType
  className?: string
  children: React.ReactNode
  touchTarget?: boolean
  balance?: boolean
  pretty?: boolean
}

export type { TypographyProps }

/**
 * Typography component for consistent text styling across the application
 * Implements responsive typography with proper line heights and touch targets
 */
export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  as,
  className,
  children,
  touchTarget = false,
  balance = false,
  pretty = false,
  ...props
}) => {
  // Determine the HTML element to render
  const getDefaultElement = (variant: TypographyVariant): React.ElementType => {
    if (variant.startsWith('display')) return 'h1'
    if (variant.startsWith('heading-1')) return 'h1'
    if (variant.startsWith('heading-2')) return 'h2'
    if (variant.startsWith('heading-3')) return 'h3'
    if (variant.startsWith('heading-4')) return 'h4'
    if (variant.startsWith('heading-5')) return 'h5'
    if (variant.startsWith('heading-6')) return 'h6'
    if (variant === 'caption') return 'span'
    if (variant === 'link') return 'a'
    return 'p'
  }

  const Element = as || getDefaultElement(variant)
  
  // Get the appropriate typography class
  const typographyClass = variant.startsWith('heading-') 
    ? getResponsiveTypographyClass(variant)
    : typographyClasses[variant]

  const classes = cn(
    typographyClass,
    touchTarget && getTouchTargetClass(),
    balance && 'text-balance',
    pretty && 'text-pretty',
    className
  )

  return (
    <Element className={classes} {...props}>
      {children}
    </Element>
  )
}

// Convenience components for common typography patterns
export const Heading1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="heading-1" {...props} />
)

export const Heading2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="heading-2" {...props} />
)

export const Heading3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="heading-3" {...props} />
)

export const Heading4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="heading-4" {...props} />
)

export const Heading5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="heading-5" {...props} />
)

export const Heading6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="heading-6" {...props} />
)

export const BodyText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body" {...props} />
)

export const BodyLarge: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body-lg" {...props} />
)

export const BodySmall: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body-sm" {...props} />
)

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
)

export const Link: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="link" {...props} />
)

export const DisplayXL: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="display-xl" {...props} />
)

export const DisplayLarge: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="display-lg" {...props} />
)