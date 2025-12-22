import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Breadcrumbs } from './Breadcrumbs'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../utils/classNames'

export interface MainLayoutProps {
  className?: string
}

/**
 * MainLayout component that provides the application shell with header, sidebar, and content area.
 * Automatically detects authentication state and adjusts layout accordingly.
 * 
 * Requirements: 8.2 - THE System SHALL provide navigation to customers, invoices, and settings pages
 */
const MainLayout: React.FC<MainLayoutProps> = ({ className }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { user, isAuthenticated, loading, logout, loadUser } = useAuthStore()

  // Load user session on mount
  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleMenuClose = () => {
    setIsMobileMenuOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout failed:', error)
      // Force navigation even if logout fails
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className={cn('flex h-screen bg-gray-50', className)}>
      {/* Sidebar - only render when authenticated */}
      {isAuthenticated && (
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={handleMenuClose}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          user={user}
          onMenuToggle={handleMenuToggle}
          onLogout={handleLogout}
          isMobileMenuOpen={isMobileMenuOpen}
          isLoading={loading}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div
            className={cn(
              'mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8',
              // Adjust padding when sidebar is not present (unauthenticated)
              !isAuthenticated && 'max-w-4xl'
            )}
          >
            {/* Breadcrumbs - only show for authenticated users */}
            {isAuthenticated && <Breadcrumbs className="mb-6" />}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export { MainLayout }