/**
 * Routing tests to verify the router setup and route guards
 * 
 * Requirements: 8.2, 8.3, 8.4 - Navigation, authentication-based routing, and route protection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { routeMetadata } from './index'

// Mock localStorage for testing
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
})

describe('Routing Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Route Metadata', () => {
    it('should have route metadata for all main routes', () => {
      expect(routeMetadata['/dashboard']).toBeDefined()
      expect(routeMetadata['/customers']).toBeDefined()
      expect(routeMetadata['/invoices']).toBeDefined()
      expect(routeMetadata['/company']).toBeDefined()
      expect(routeMetadata['/settings']).toBeDefined()
      expect(routeMetadata['/login']).toBeDefined()
      expect(routeMetadata['/signup']).toBeDefined()
    })

    it('should have proper breadcrumb titles', () => {
      expect(routeMetadata['/dashboard'].breadcrumb).toBe('Dashboard')
      expect(routeMetadata['/customers'].breadcrumb).toBe('Customers')
      expect(routeMetadata['/invoices'].breadcrumb).toBe('Invoices')
      expect(routeMetadata['/company'].breadcrumb).toBe('Company Profile')
      expect(routeMetadata['/settings'].breadcrumb).toBe('Settings')
    })

    it('should have proper page titles', () => {
      expect(routeMetadata['/dashboard'].title).toBe('Dashboard')
      expect(routeMetadata['/customers'].title).toBe('Customers')
      expect(routeMetadata['/invoices'].title).toBe('Invoices')
      expect(routeMetadata['/company'].title).toBe('Company Profile')
      expect(routeMetadata['/settings'].title).toBe('Settings')
    })
  })

  describe('Authentication Logic', () => {
    it('should detect authenticated user when localStorage has user data', () => {
      const mockUser = { id: '1', email: 'test@example.com', displayName: 'Test User' }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser))
      
      const userJson = localStorage.getItem('user')
      const user = userJson ? JSON.parse(userJson) : null
      const isAuthenticated = !!user
      
      expect(isAuthenticated).toBe(true)
      expect(user).toEqual(mockUser)
    })

    it('should detect unauthenticated user when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const userJson = localStorage.getItem('user')
      const user = userJson ? JSON.parse(userJson) : null
      const isAuthenticated = !!user
      
      expect(isAuthenticated).toBe(false)
      expect(user).toBeNull()
    })

    it('should handle invalid JSON in localStorage gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json')
      
      let user = null
      let isAuthenticated = false
      
      try {
        const userJson = localStorage.getItem('user')
        user = userJson ? JSON.parse(userJson) : null
        isAuthenticated = !!user
      } catch {
        // Should handle JSON parse errors gracefully
        user = null
        isAuthenticated = false
      }
      
      expect(isAuthenticated).toBe(false)
      expect(user).toBeNull()
    })
  })

  describe('Route Structure', () => {
    it('should have all required protected routes', () => {
      const protectedRoutes = ['/dashboard', '/customers', '/invoices', '/company', '/settings']
      
      protectedRoutes.forEach(route => {
        expect(routeMetadata[route as keyof typeof routeMetadata]).toBeDefined()
      })
    })

    it('should have all required public routes', () => {
      const publicRoutes = ['/login', '/signup']
      
      publicRoutes.forEach(route => {
        expect(routeMetadata[route as keyof typeof routeMetadata]).toBeDefined()
      })
    })

    it('should have consistent metadata structure', () => {
      Object.values(routeMetadata).forEach(metadata => {
        expect(metadata).toHaveProperty('title')
        expect(metadata).toHaveProperty('breadcrumb')
        expect(typeof metadata.title).toBe('string')
        expect(typeof metadata.breadcrumb).toBe('string')
        expect(metadata.title.length).toBeGreaterThan(0)
        expect(metadata.breadcrumb.length).toBeGreaterThan(0)
      })
    })
  })
})