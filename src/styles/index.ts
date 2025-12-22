/**
 * Design System Exports
 * Central export point for all design system utilities
 */

export * from './design-tokens'
export * from './typography'

// Re-export utility functions
export { cn, clsx, createVariants, createSizes } from '../utils/classNames'

// Design system configuration validation
export function validateDesignSystem() {
  const requiredColors = ['primary', 'secondary', 'success', 'danger', 'gray']
  const requiredBreakpoints = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
  const requiredShadows = ['soft', 'medium', 'hard', 'glow']
  
  // This would be expanded with actual validation logic
  // For now, it serves as a placeholder for design system validation
  return {
    colors: requiredColors.length === 5,
    breakpoints: requiredBreakpoints.length === 6,
    shadows: requiredShadows.length === 4,
    isValid: true,
  }
}

// Helper function to get CSS custom property value
export function getCSSCustomProperty(property: string): string {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(property).trim()
  }
  return ''
}

// Helper function to set CSS custom property
export function setCSSCustomProperty(property: string, value: string): void {
  if (typeof window !== 'undefined') {
    document.documentElement.style.setProperty(property, value)
  }
}