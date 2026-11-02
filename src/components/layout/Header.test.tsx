import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import * as fc from 'fast-check'
import { Header, type HeaderProps } from './Header'

// Mock react-router-dom's useLocation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: () => ({ pathname: '/dashboard' }),
  }
})

// Helper function to render Header with router context
const renderHeader = (props: Partial<HeaderProps> = {}) => {
  const defaultProps: HeaderProps = {
    user: null,
    onMenuToggle: vi.fn(),
    onLogout: vi.fn(),
    isMobileMenuOpen: false,
    className: '',
    isLoading: false,
    ...props,
  }

  return render(
    <BrowserRouter>
      <Header {...defaultProps} />
    </BrowserRouter>
  )
}

// Clean up after each test to prevent DOM conflicts
afterEach(() => {
  cleanup()
})

describe('Header Property Tests', () => {
  describe('Property 13: Header Glass Morphism', () => {
    it('should implement glass morphism effects with backdrop blur and transparency', () => {
      fc.assert(
        fc.property(
          fc.record({
            user: fc.option(
              fc.record({
                displayName: fc.string({ minLength: 1, maxLength: 20 }),
                email: fc.emailAddress(),
              }),
              { nil: null }
            ),
            isLoading: fc.boolean(),
          }),
          props => {
            const { unmount } = renderHeader(props)

            const header = screen.getByRole('banner')

            // Feature: ui-modernization, Property 13: Header Glass Morphism
            // Verify glass morphism classes are applied
            expect(header).toHaveClass('bg-white/80')
            expect(header).toHaveClass('backdrop-blur-lg')
            expect(header).toHaveClass('border-b')
            expect(header).toHaveClass('border-white/20')
            expect(header).toHaveClass('shadow-soft')

            unmount()
          }
        ),
        { numRuns: 5 }
      )
    })
  })

  describe('Property 14: Navigation Responsive Behavior', () => {
    it('should display navigation elements with proper responsive classes', () => {
      fc.assert(
        fc.property(
          fc.record({
            user: fc.record({
              displayName: fc.string({ minLength: 1, maxLength: 20 }),
              email: fc.emailAddress(),
            }),
            isMobileMenuOpen: fc.boolean(),
          }),
          props => {
            const { unmount } = renderHeader(props)

            // Feature: ui-modernization, Property 14: Navigation Responsive Behavior
            // Check that desktop navigation exists with proper classes
            const desktopNavs = document.querySelectorAll('nav.lg\\:flex')
            expect(desktopNavs.length).toBeGreaterThan(0)

            const desktopNav = desktopNavs[0]
            expect(desktopNav).toHaveClass(
              'hidden',
              'lg:flex',
              'bg-gray-100',
              'rounded-2xl',
              'p-2'
            )

            // Check that mobile menu button exists with proper classes
            const menuButtons = document.querySelectorAll(
              'button[aria-label*="menu"]'
            )
            expect(menuButtons.length).toBeGreaterThan(0)

            const menuButton = menuButtons[0]
            expect(menuButton).toHaveClass('lg:hidden')
            expect(menuButton).toHaveClass('min-h-11', 'min-w-11') // 44px touch target

            unmount()
          }
        ),
        { numRuns: 5 }
      )
    })
  })

  describe('Property 15: Navigation Active State', () => {
    it('should provide proper styling for active state support', () => {
      fc.assert(
        fc.property(
          fc.record({
            user: fc.record({
              displayName: fc.string({ minLength: 1, maxLength: 20 }),
              email: fc.emailAddress(),
            }),
          }),
          props => {
            const { unmount } = renderHeader(props)

            // Feature: ui-modernization, Property 15: Navigation Active State
            // Find desktop navigation
            const desktopNavs = document.querySelectorAll('nav.lg\\:flex')
            expect(desktopNavs.length).toBeGreaterThan(0)

            const desktopNav = desktopNavs[0]
            expect(desktopNav).toHaveClass('space-x-2') // Proper spacing for pill navigation

            // Each navigation item should support active state styling
            const navItems = desktopNav.querySelectorAll('a')
            navItems.forEach(item => {
              // Should have transition classes for smooth active state changes
              expect(item).toHaveClass('transition-all', 'duration-200')
              // Should have proper structure for active state highlighting
              expect(item).toHaveClass('rounded-xl', 'px-4', 'py-2')
            })

            unmount()
          }
        ),
        { numRuns: 5 }
      )
    })
  })

  describe('Property 16: Logo Interactive Effects', () => {
    it('should provide a branded home link for the current authentication state', () => {
      fc.assert(
        fc.property(
          fc.record({
            user: fc.option(
              fc.record({
                displayName: fc.string({ minLength: 1, maxLength: 20 }),
                email: fc.emailAddress(),
              }),
              { nil: null }
            ),
            isLoading: fc.boolean(),
          }),
          props => {
            const { unmount } = renderHeader(props)

            const logo = screen.getByRole('img', { name: 'Invoiceo home' })
            const link = logo.closest('a')
            expect(link).toHaveAttribute(
              'href',
              props.user ? '/dashboard' : '/'
            )
            expect(logo).toHaveAttribute('src')

            unmount()
          }
        ),
        { numRuns: 5 }
      )
    })
  })

  // Additional unit tests for specific behaviors
  describe('Unit Tests', () => {
    it('should toggle mobile menu when hamburger button is clicked', () => {
      const onMenuToggle = vi.fn()
      renderHeader({
        user: { displayName: 'Test User', email: 'test@example.com' },
        onMenuToggle,
        isMobileMenuOpen: false,
      })

      const menuButton = screen.getByLabelText('Open menu')
      fireEvent.click(menuButton)

      expect(onMenuToggle).toHaveBeenCalledTimes(1)
    })

    it('should call onLogout when logout button is clicked', () => {
      const onLogout = vi.fn()
      renderHeader({
        user: { displayName: 'Test User', email: 'test@example.com' },
        onLogout,
      })

      const logoutButton = screen.getByLabelText('Logout')
      fireEvent.click(logoutButton)

      expect(onLogout).toHaveBeenCalledTimes(1)
    })

    it('should show loading state when isLoading is true', () => {
      renderHeader({ isLoading: true })

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      // Check for loading spinner by class instead of role
      const loadingSpinner = document.querySelector('.animate-spin')
      expect(loadingSpinner).toBeInTheDocument()
    })

    it('should not show navigation when user is not authenticated', () => {
      renderHeader({ user: null })

      // Should not show desktop navigation
      const navElements = screen.queryAllByRole('navigation')
      expect(navElements).toHaveLength(0)

      // Should not show mobile menu button
      expect(screen.queryByLabelText(/menu/i)).not.toBeInTheDocument()
    })

    it('should show user info when authenticated', () => {
      const user = { displayName: 'John Doe', email: 'john@example.com' }
      renderHeader({ user })

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })
  })
})
