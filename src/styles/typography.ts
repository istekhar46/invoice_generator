/**
 * Modern Typography System
 * Provides type-safe typography utilities and responsive text classes
 */

export type TypographyVariant = 
  | 'display-2xl'
  | 'display-xl' 
  | 'display-lg'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'heading-5'
  | 'heading-6'
  | 'body-lg'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'link'

export type FontWeight = 
  | 'thin'
  | 'extralight'
  | 'light'
  | 'normal'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'extrabold'
  | 'black'

export type LineHeight = 
  | 'none'
  | 'tight'
  | 'snug'
  | 'normal'
  | 'relaxed'
  | 'loose'

export type LetterSpacing = 
  | 'tighter'
  | 'tight'
  | 'normal'
  | 'wide'
  | 'wider'
  | 'widest'

/**
 * Typography class mapping for consistent styling
 */
export const typographyClasses: Record<TypographyVariant, string> = {
  'display-2xl': 'text-display-2xl',
  'display-xl': 'text-display-xl',
  'display-lg': 'text-display-lg',
  'heading-1': 'heading-1',
  'heading-2': 'heading-2',
  'heading-3': 'heading-3',
  'heading-4': 'heading-4',
  'heading-5': 'heading-5',
  'heading-6': 'heading-6',
  'body-lg': 'text-body-lg',
  'body': 'text-body',
  'body-sm': 'text-body-sm',
  'caption': 'text-caption',
  'link': 'text-link'
}

/**
 * Responsive font size mapping for different breakpoints
 */
export const responsiveFontSizes = {
  mobile: {
    'heading-1': 'text-3xl',
    'heading-2': 'text-2xl',
    'heading-3': 'text-xl',
    'heading-4': 'text-lg',
    'heading-5': 'text-base',
    'heading-6': 'text-sm'
  },
  tablet: {
    'heading-1': 'sm:text-4xl',
    'heading-2': 'sm:text-3xl',
    'heading-3': 'sm:text-2xl',
    'heading-4': 'sm:text-xl',
    'heading-5': 'sm:text-lg',
    'heading-6': 'sm:text-base'
  },
  desktop: {
    'heading-1': 'lg:text-5xl',
    'heading-2': 'lg:text-4xl',
    'heading-3': 'lg:text-3xl',
    'heading-4': 'lg:text-2xl',
    'heading-5': 'lg:text-xl',
    'heading-6': 'lg:text-base'
  }
}

/**
 * Touch target minimum sizes for accessibility
 */
export const touchTargetSizes = {
  minimum: '44px',
  comfortable: '48px',
  large: '52px'
}

/**
 * Line height recommendations for different text types
 */
export const lineHeightRecommendations = {
  display: 'leading-none',
  heading: 'leading-tight',
  body: 'leading-relaxed',
  caption: 'leading-normal'
}

/**
 * Utility function to get responsive typography classes
 */
export function getResponsiveTypographyClass(variant: TypographyVariant): string {
  const baseClass = typographyClasses[variant]
  
  // For heading variants, add responsive classes
  if (variant.startsWith('heading-')) {
    const headingKey = variant as keyof typeof responsiveFontSizes.mobile
    return [
      responsiveFontSizes.mobile[headingKey],
      responsiveFontSizes.tablet[headingKey],
      responsiveFontSizes.desktop[headingKey]
    ].filter(Boolean).join(' ')
  }
  
  return baseClass
}

/**
 * Utility function to ensure minimum touch targets
 */
export function getTouchTargetClass(size: keyof typeof touchTargetSizes = 'minimum'): string {
  const minHeight = touchTargetSizes[size]
  return `min-h-[${minHeight}] min-w-[${minHeight}]`
}

/**
 * Font loading optimization utilities
 */
export const fontLoadingOptimization = {
  preloadFonts: [
    'Inter-Regular.woff2',
    'Inter-Medium.woff2',
    'Inter-SemiBold.woff2',
    'Inter-Bold.woff2'
  ],
  fontDisplay: 'swap',
  fallbackFonts: [
    'Inter Fallback',
    'ui-sans-serif',
    'system-ui',
    'sans-serif'
  ]
}

/**
 * Typography scale for consistent sizing
 */
export const typographyScale = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px (responsive)
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
  '5xl': '3rem',     // 48px
  '6xl': '3.75rem',  // 60px
  '7xl': '4.5rem',   // 72px
  '8xl': '6rem',     // 96px
  '9xl': '8rem'      // 128px
}