/**
 * Responsive Layout Component
 * Provides responsive layout containers with mobile-first optimization
 * 
 * Requirements: 3.2, 3.3, 3.5, 9.2 - Responsive layout adaptation and mobile optimization
 */

import React from 'react'
import { cn } from '../../utils/classNames'

export interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

/**
 * Responsive container that adapts padding and max-width based on screen size
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  maxWidth = 'xl',
  padding = 'md'
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-2xl', 
    lg: 'max-w-4xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-none',
    full: 'max-w-full'
  }

  const paddingClasses = {
    none: '',
    sm: 'px-4 py-4 sm:px-6 sm:py-6',
    md: 'px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8',
    lg: 'px-6 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-12'
  }

  return (
    <div className={cn(
      'mx-auto w-full',
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  )
}

export interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  columns?: {
    mobile?: 1 | 2
    tablet?: 1 | 2 | 3 | 4
    desktop?: 1 | 2 | 3 | 4 | 5 | 6
    wide?: 1 | 2 | 3 | 4 | 5 | 6
  }
  gap?: 'sm' | 'md' | 'lg'
  alignItems?: 'start' | 'center' | 'end' | 'stretch'
}

/**
 * Responsive grid that adapts columns based on screen size
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  alignItems = 'stretch'
}) => {
  const { mobile = 1, tablet = 2, desktop = 3, wide } = columns

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8'
  }

  const alignClasses = {
    start: 'items-start',
    center: 'items-center', 
    end: 'items-end',
    stretch: 'items-stretch'
  }

  return (
    <div className={cn(
      'grid',
      `grid-cols-${mobile}`,
      `sm:grid-cols-${tablet}`,
      `lg:grid-cols-${desktop}`,
      wide && `xl:grid-cols-${wide}`,
      gapClasses[gap],
      alignClasses[alignItems],
      className
    )}>
      {children}
    </div>
  )
}

export interface ResponsiveFlexProps {
  children: React.ReactNode
  className?: string
  direction?: {
    mobile?: 'row' | 'col'
    tablet?: 'row' | 'col'
    desktop?: 'row' | 'col'
  }
  gap?: 'sm' | 'md' | 'lg'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
}

/**
 * Responsive flex container that adapts direction and spacing
 */
export const ResponsiveFlex: React.FC<ResponsiveFlexProps> = ({
  children,
  className,
  direction = { mobile: 'col', tablet: 'row' },
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false
}) => {
  const { mobile = 'col', tablet = 'row', desktop = tablet } = direction

  const gapClasses = {
    sm: mobile === 'col' ? 'space-y-3' : 'space-x-3',
    md: mobile === 'col' ? 'space-y-4' : 'space-x-4',
    lg: mobile === 'col' ? 'space-y-6' : 'space-x-6'
  }

  const tabletGapClasses = {
    sm: tablet === 'col' ? 'sm:space-y-3 sm:space-x-0' : 'sm:space-x-3 sm:space-y-0',
    md: tablet === 'col' ? 'sm:space-y-4 sm:space-x-0' : 'sm:space-x-4 sm:space-y-0',
    lg: tablet === 'col' ? 'sm:space-y-6 sm:space-x-0' : 'sm:space-x-6 sm:space-y-0'
  }

  const desktopGapClasses = {
    sm: desktop === 'col' ? 'lg:space-y-3 lg:space-x-0' : 'lg:space-x-3 lg:space-y-0',
    md: desktop === 'col' ? 'lg:space-y-4 lg:space-x-0' : 'lg:space-x-4 lg:space-y-0',
    lg: desktop === 'col' ? 'lg:space-y-6 lg:space-x-0' : 'lg:space-x-6 lg:space-y-0'
  }

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end', 
    stretch: 'items-stretch'
  }

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  }

  return (
    <div className={cn(
      'flex',
      `flex-${mobile}`,
      `sm:flex-${tablet}`,
      `lg:flex-${desktop}`,
      gapClasses[gap],
      tabletGapClasses[gap],
      desktopGapClasses[gap],
      alignClasses[align],
      justifyClasses[justify],
      wrap && 'flex-wrap',
      className
    )}>
      {children}
    </div>
  )
}

export interface MobileOptimizedSectionProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  padding?: 'sm' | 'md' | 'lg'
  background?: 'none' | 'subtle' | 'elevated'
}

/**
 * Mobile-optimized section with thumb-friendly spacing and touch targets
 */
export const MobileOptimizedSection: React.FC<MobileOptimizedSectionProps> = ({
  children,
  className,
  title,
  description,
  padding = 'md',
  background = 'none'
}) => {
  const paddingClasses = {
    sm: 'p-4 sm:p-6',
    md: 'p-4 sm:p-6 lg:p-8',
    lg: 'p-6 sm:p-8 lg:p-12'
  }

  const backgroundClasses = {
    none: '',
    subtle: 'bg-gray-50/50',
    elevated: 'bg-white shadow-soft rounded-2xl border border-gray-100'
  }

  return (
    <section className={cn(
      paddingClasses[padding],
      backgroundClasses[background],
      'space-y-6',
      className
    )}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4 sm:space-y-6">
        {children}
      </div>
    </section>
  )
}

export interface TouchFriendlyListProps {
  children: React.ReactNode
  className?: string
  spacing?: 'sm' | 'md' | 'lg'
  dividers?: boolean
}

/**
 * Touch-friendly list with proper spacing for thumb navigation
 */
export const TouchFriendlyList: React.FC<TouchFriendlyListProps> = ({
  children,
  className,
  spacing = 'md',
  dividers = false
}) => {
  const spacingClasses = {
    sm: 'space-y-1',
    md: 'space-y-2', 
    lg: 'space-y-3'
  }

  return (
    <div className={cn(
      spacingClasses[spacing],
      dividers && 'divide-y divide-gray-200',
      className
    )}>
      {React.Children.map(children, (child, index) => (
        <div key={index} className={cn(
          'min-h-[44px] flex items-center',
          dividers && index > 0 && 'pt-2'
        )}>
          {child}
        </div>
      ))}
    </div>
  )
}

export interface ResponsiveStackProps {
  children: React.ReactNode
  className?: string
  spacing?: 'sm' | 'md' | 'lg'
  align?: 'start' | 'center' | 'end' | 'stretch'
}

/**
 * Responsive stack that provides consistent vertical spacing
 */
export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  className,
  spacing = 'md',
  align = 'stretch'
}) => {
  const spacingClasses = {
    sm: 'space-y-3 sm:space-y-4',
    md: 'space-y-4 sm:space-y-6 lg:space-y-8',
    lg: 'space-y-6 sm:space-y-8 lg:space-y-12'
  }

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  }

  return (
    <div className={cn(
      'flex flex-col',
      spacingClasses[spacing],
      alignClasses[align],
      className
    )}>
      {children}
    </div>
  )
}