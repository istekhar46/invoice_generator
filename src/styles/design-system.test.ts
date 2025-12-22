/**
 * Design System Foundation Tests
 * Tests to verify the modern design system is properly configured
 */

import { describe, it, expect } from 'vitest'
import { designTokens, validateDesignSystem, TOUCH_TARGET, ACCESSIBILITY } from './index'

describe('Design System Foundation', () => {
  describe('Color System', () => {
    it('should have complete primary color palette', () => {
      const primaryColors = designTokens.colors.primary
      const expectedShades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const
      
      expectedShades.forEach(shade => {
        expect(primaryColors[shade]).toBeDefined()
        expect(primaryColors[shade]).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })

    it('should have all required color variants', () => {
      expect(designTokens.colors.primary).toBeDefined()
      expect(designTokens.colors.secondary).toBeDefined()
      expect(designTokens.colors.success).toBeDefined()
      expect(designTokens.colors.danger).toBeDefined()
      expect(designTokens.colors.gray).toBeDefined()
    })

    it('should have electric blue as primary-500', () => {
      expect(designTokens.colors.primary[500]).toBe('#3b82f6')
    })
  })

  describe('Breakpoints', () => {
    it('should have all required breakpoints', () => {
      const breakpoints = designTokens.breakpoints
      expect(breakpoints.xs).toBe('475px')
      expect(breakpoints.sm).toBe('640px')
      expect(breakpoints.md).toBe('768px')
      expect(breakpoints.lg).toBe('1024px')
      expect(breakpoints.xl).toBe('1280px')
      expect(breakpoints['2xl']).toBe('1536px')
    })
  })

  describe('Typography', () => {
    it('should have Inter font family configured', () => {
      expect(designTokens.typography.fontFamily.sans).toContain('Inter')
    })

    it('should have complete font size scale', () => {
      const sizes = designTokens.typography.fontSize
      expect(sizes.xs).toBe('0.75rem')
      expect(sizes.sm).toBe('0.875rem')
      expect(sizes.base).toBe('1rem')
      expect(sizes.lg).toBe('1.125rem')
      expect(sizes['5xl']).toBe('3rem')
    })
  })

  describe('Shadows', () => {
    it('should have all shadow variations', () => {
      const shadows = designTokens.shadows
      expect(shadows.soft).toBeDefined()
      expect(shadows.medium).toBeDefined()
      expect(shadows.hard).toBeDefined()
      expect(shadows.glow).toBeDefined()
    })
  })

  describe('Gradients', () => {
    it('should have gradient definitions for all color variants', () => {
      const gradients = designTokens.gradients
      expect(gradients.primary).toContain('linear-gradient')
      expect(gradients.secondary).toContain('linear-gradient')
      expect(gradients.success).toContain('linear-gradient')
      expect(gradients.danger).toContain('linear-gradient')
    })
  })

  describe('Touch Targets', () => {
    it('should define minimum touch target size', () => {
      expect(TOUCH_TARGET.MIN_HEIGHT).toBe(44)
      expect(TOUCH_TARGET.MIN_WIDTH).toBe(44)
    })
  })

  describe('Accessibility', () => {
    it('should define WCAG contrast ratios', () => {
      expect(ACCESSIBILITY.CONTRAST_RATIOS.AA_NORMAL).toBe(4.5)
      expect(ACCESSIBILITY.CONTRAST_RATIOS.AA_LARGE).toBe(3.0)
    })
  })

  describe('Design System Validation', () => {
    it('should validate design system completeness', () => {
      const validation = validateDesignSystem()
      expect(validation.colors).toBe(true)
      expect(validation.breakpoints).toBe(true)
      expect(validation.shadows).toBe(true)
      expect(validation.isValid).toBe(true)
    })
  })
})