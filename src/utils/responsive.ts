/**
 * Responsive Layout Utilities
 * Provides utilities for responsive layout adaptation and mobile optimization
 * 
 * Requirements: 3.2, 3.3, 3.5, 9.2 - Responsive layout system with mobile-first approach
 */

import { cn } from './classNames'

/**
 * Responsive container utility that adapts padding and max-width based on screen size
 */
export const responsiveContainer = (className?: string) => cn(
  // Mobile-first padding with thumb-friendly spacing
  'px-4 py-4',
  // Tablet adjustments
  'sm:px-6 sm:py-6',
  // Desktop adjustments  
  'lg:px-8 lg:py-8',
  // Max width constraints
  'max-w-7xl mx-auto',
  className
)

/**
 * Responsive grid utility that adapts columns based on screen size
 */
export const responsiveGrid = (
  columns: {
    mobile?: number
    tablet?: number
    desktop?: number
    wide?: number
  } = {},
  gap: 'sm' | 'md' | 'lg' = 'md',
  className?: string
) => {
  const { mobile = 1, tablet = 2, desktop = 3, wide = 4 } = columns
  
  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6', 
    lg: 'gap-8'
  }

  return cn(
    'grid',
    `grid-cols-${mobile}`,
    tablet && `sm:grid-cols-${tablet}`,
    desktop && `lg:grid-cols-${desktop}`,
    wide && `xl:grid-cols-${wide}`,
    gapClasses[gap],
    className
  )
}

/**
 * Responsive flex utility that adapts direction and spacing
 */
export const responsiveFlex = (
  direction: {
    mobile?: 'row' | 'col'
    tablet?: 'row' | 'col'
    desktop?: 'row' | 'col'
  } = {},
  gap: 'sm' | 'md' | 'lg' = 'md',
  className?: string
) => {
  const { mobile = 'col', tablet = 'row', desktop = 'row' } = direction
  
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

  return cn(
    'flex',
    `flex-${mobile}`,
    tablet && `sm:flex-${tablet}`,
    desktop && `lg:flex-${desktop}`,
    gapClasses[gap],
    tabletGapClasses[gap],
    desktopGapClasses[gap],
    className
  )
}

/**
 * Responsive spacing utility for consistent padding/margin across breakpoints
 */
export const responsiveSpacing = (
  type: 'p' | 'm' | 'px' | 'py' | 'mx' | 'my' | 'pt' | 'pb' | 'pl' | 'pr' | 'mt' | 'mb' | 'ml' | 'mr',
  sizes: {
    mobile?: number
    tablet?: number
    desktop?: number
  },
  className?: string
) => {
  const { mobile = 4, tablet = 6, desktop = 8 } = sizes
  
  return cn(
    `${type}-${mobile}`,
    `sm:${type}-${tablet}`,
    `lg:${type}-${desktop}`,
    className
  )
}

/**
 * Touch-friendly interactive element utility
 * Ensures minimum 44px touch targets and thumb-friendly spacing
 */
export const touchFriendly = (className?: string) => cn(
  // Minimum touch target size
  'min-h-[44px] min-w-[44px]',
  // Touch-friendly padding
  'px-4 py-3',
  // Larger touch targets on mobile
  'sm:min-h-[48px]',
  // Hover states for non-touch devices
  'hover:scale-[1.02] active:scale-[0.98]',
  'transition-transform duration-150',
  className
)

/**
 * Mobile-optimized form layout utility
 */
export const mobileFormLayout = (className?: string) => cn(
  // Full width on mobile for easy thumb interaction
  'w-full',
  // Larger touch targets
  'min-h-[44px]',
  // Thumb-friendly spacing
  'mb-4',
  // Tablet and desktop adjustments
  'sm:mb-6',
  'lg:mb-8',
  className
)

/**
 * Responsive card layout utility
 */
export const responsiveCard = (
  variant: 'mobile-full' | 'mobile-padded' | 'desktop-grid' = 'mobile-padded',
  className?: string
) => {
  const variants = {
    'mobile-full': cn(
      // Full width on mobile with minimal padding
      'w-full mx-0 px-4 py-4',
      // Add padding and constraints on larger screens
      'sm:mx-auto sm:px-6 sm:py-6 sm:max-w-2xl',
      'lg:px-8 lg:py-8 lg:max-w-4xl'
    ),
    'mobile-padded': cn(
      // Comfortable padding on mobile
      'w-full mx-4 px-4 py-4',
      // Centered with more padding on larger screens
      'sm:mx-auto sm:px-6 sm:py-6 sm:max-w-2xl',
      'lg:px-8 lg:py-8 lg:max-w-4xl'
    ),
    'desktop-grid': cn(
      // Single column on mobile
      'w-full',
      // Grid layout on larger screens
      'lg:max-w-none'
    )
  }

  return cn(variants[variant], className)
}

/**
 * Responsive text sizing utility
 */
export const responsiveText = (
  size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl',
  className?: string
) => {
  const sizeMap = {
    'xs': 'text-xs sm:text-sm',
    'sm': 'text-sm sm:text-base',
    'base': 'text-base sm:text-lg',
    'lg': 'text-lg sm:text-xl',
    'xl': 'text-xl sm:text-2xl',
    '2xl': 'text-2xl sm:text-3xl',
    '3xl': 'text-3xl sm:text-4xl lg:text-5xl',
    '4xl': 'text-4xl sm:text-5xl lg:text-6xl',
    '5xl': 'text-5xl sm:text-6xl lg:text-7xl'
  }

  return cn(sizeMap[size], className)
}

/**
 * Mobile navigation utility for thumb-friendly navigation
 */
export const mobileNavigation = (className?: string) => cn(
  // Full width touch targets
  'w-full min-h-[44px]',
  // Thumb-friendly padding
  'px-4 py-3',
  // Easy-to-tap spacing between items
  'mb-1',
  // Visual feedback
  'transition-all duration-200',
  'active:bg-gray-100',
  className
)

/**
 * Responsive button group utility
 */
export const responsiveButtonGroup = (className?: string) => cn(
  // Stack vertically on mobile
  'flex flex-col space-y-3',
  // Horizontal on tablet and up
  'sm:flex-row sm:space-y-0 sm:space-x-3',
  // Full width buttons on mobile
  '[&>*]:w-full sm:[&>*]:w-auto',
  className
)

/**
 * Responsive modal/dialog utility
 */
export const responsiveModal = (className?: string) => cn(
  // Full screen on mobile
  'w-full h-full sm:h-auto',
  // Centered with max width on larger screens
  'sm:max-w-lg sm:mx-auto sm:my-8',
  // Responsive padding
  'p-4 sm:p-6 lg:p-8',
  className
)

/**
 * Utility to check if current screen size is mobile
 * Note: This is a CSS-only utility, for JS detection use window.innerWidth
 */
export const isMobileScreen = () => {
  if (typeof window !== 'undefined') {
    return window.innerWidth < 640 // sm breakpoint
  }
  return false
}

/**
 * Utility to get responsive breakpoint classes
 */
export const getBreakpointClasses = (
  mobile: string,
  tablet?: string,
  desktop?: string,
  wide?: string
) => cn(
  mobile,
  tablet && `sm:${tablet}`,
  desktop && `lg:${desktop}`,
  wide && `xl:${wide}`
)