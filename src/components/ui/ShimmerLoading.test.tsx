/**
 * ShimmerLoading Component Tests
 * Tests for shimmer loading components and animations
 */

import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { 
  Shimmer, 
  ShimmerCard, 
  ShimmerStats, 
  ShimmerTable,
  ShimmerList,
  ShimmerForm
} from './ShimmerLoading'

describe('ShimmerLoading Components', () => {
  describe('Shimmer', () => {
    it('renders with default props', () => {
      const { container } = render(<Shimmer />)
      const shimmerElement = container.firstChild as HTMLElement
      
      expect(shimmerElement).toHaveClass('animate-shimmer')
      expect(shimmerElement).toHaveClass('w-full')
      expect(shimmerElement).toHaveClass('h-4')
      expect(shimmerElement).toHaveClass('rounded-md')
    })

    it('applies custom dimensions and styling', () => {
      const { container } = render(
        <Shimmer 
          width="w-32" 
          height="h-8" 
          rounded="full" 
          className="custom-class" 
        />
      )
      const shimmerElement = container.firstChild as HTMLElement
      
      expect(shimmerElement).toHaveClass('w-32')
      expect(shimmerElement).toHaveClass('h-8')
      expect(shimmerElement).toHaveClass('rounded-full')
      expect(shimmerElement).toHaveClass('custom-class')
    })
  })

  describe('ShimmerCard', () => {
    it('renders card with shimmer lines', () => {
      const { container } = render(<ShimmerCard lines={3} />)
      const shimmerElements = container.querySelectorAll('.animate-shimmer')
      
      expect(shimmerElements).toHaveLength(3)
    })

    it('renders with avatar when showAvatar is true', () => {
      const { container } = render(<ShimmerCard showAvatar={true} />)
      const shimmerElements = container.querySelectorAll('.animate-shimmer')
      
      // Should have avatar shimmer + default 3 lines + 2 avatar text lines
      expect(shimmerElements.length).toBeGreaterThan(3)
    })
  })

  describe('ShimmerStats', () => {
    it('renders correct number of stat cards', () => {
      const { container } = render(<ShimmerStats cards={4} />)
      const cardElements = container.querySelectorAll('.bg-white.border.border-gray-200')
      
      expect(cardElements).toHaveLength(4)
    })

    it('applies responsive grid classes', () => {
      const { container } = render(<ShimmerStats />)
      const gridElement = container.firstChild as HTMLElement
      
      expect(gridElement).toHaveClass('grid')
      expect(gridElement).toHaveClass('grid-cols-1')
      expect(gridElement).toHaveClass('sm:grid-cols-2')
      expect(gridElement).toHaveClass('lg:grid-cols-4')
    })
  })

  describe('ShimmerTable', () => {
    it('renders table with correct structure', () => {
      const { container } = render(<ShimmerTable rows={3} columns={4} />)
      const shimmerElements = container.querySelectorAll('.animate-shimmer')
      
      // Should have header (4) + rows (3 * 4) = 16 shimmer elements
      expect(shimmerElements).toHaveLength(16)
    })

    it('hides header when showHeader is false', () => {
      const { container } = render(<ShimmerTable rows={3} columns={4} showHeader={false} />)
      const shimmerElements = container.querySelectorAll('.animate-shimmer')
      
      // Should have only rows (3 * 4) = 12 shimmer elements
      expect(shimmerElements).toHaveLength(12)
    })
  })

  describe('ShimmerList', () => {
    it('renders list items with correct structure', () => {
      const { container } = render(<ShimmerList items={3} />)
      const listItems = container.querySelectorAll('.bg-white.border.border-gray-200')
      
      expect(listItems).toHaveLength(3)
    })

    it('includes avatar when showAvatar is true', () => {
      const { container } = render(<ShimmerList items={2} showAvatar={true} />)
      const avatarShimmers = container.querySelectorAll('.rounded-full')
      
      expect(avatarShimmers).toHaveLength(2)
    })

    it('includes action buttons when showActions is true', () => {
      const { container } = render(<ShimmerList items={2} showActions={true} />)
      const actionShimmers = container.querySelectorAll('.w-8.h-8')
      
      expect(actionShimmers.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('ShimmerForm', () => {
    it('renders form fields', () => {
      const { container } = render(<ShimmerForm fields={3} />)
      const fieldContainers = container.querySelectorAll('.space-y-2')
      
      expect(fieldContainers).toHaveLength(3)
    })

    it('includes buttons when showButtons is true', () => {
      const { container } = render(<ShimmerForm fields={2} showButtons={true} />)
      const buttonShimmers = container.querySelectorAll('.h-11')
      
      // Should have 2 field inputs + 2 buttons = 4 elements with h-11
      expect(buttonShimmers).toHaveLength(4)
    })
  })
})