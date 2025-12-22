/**
 * Modern Design System Foundation
 * Design tokens for the UI modernization
 */

export const designTokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    secondary: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
  },
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  shadows: {
    soft: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    medium: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    hard: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    glow: '0 0 0 1px rgb(59 130 246 / 0.15), 0 4px 6px -1px rgb(59 130 246 / 0.1)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    secondary: 'linear-gradient(135deg, #d97706, #f59e0b)',
    success: 'linear-gradient(135deg, #16a34a, #22c55e)',
    danger: 'linear-gradient(135deg, #dc2626, #ef4444)',
  },
  animations: {
    fadeIn: 'fade-in 0.3s ease-out',
    slideUp: 'slide-up 0.4s ease-out',
    slideDown: 'slide-down 0.3s ease-out',
    shimmer: 'shimmer 2s infinite',
    bounceSubtle: 'bounce-subtle 0.6s ease-out',
  },
} as const

// Type definitions for design tokens
export type ColorScale = typeof designTokens.colors.primary
export type BreakpointKey = keyof typeof designTokens.breakpoints
export type SpacingKey = keyof typeof designTokens.spacing
export type ShadowKey = keyof typeof designTokens.shadows
export type GradientKey = keyof typeof designTokens.gradients
export type AnimationKey = keyof typeof designTokens.animations

// Utility types for component props
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'gray'
export type ComponentSize = 'sm' | 'md' | 'lg'
export type SpacingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

// Touch target constants
export const TOUCH_TARGET = {
  MIN_HEIGHT: 44,
  MIN_WIDTH: 44,
} as const

// Accessibility constants
export const ACCESSIBILITY = {
  CONTRAST_RATIOS: {
    AA_NORMAL: 4.5,
    AA_LARGE: 3.0,
    AAA_NORMAL: 7.0,
    AAA_LARGE: 4.5,
  },
  FOCUS_RING: {
    WIDTH: 2,
    OFFSET: 2,
  },
} as const