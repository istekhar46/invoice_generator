import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Breadcrumbs } from './Breadcrumbs'
import { ResponsiveContainer } from './ResponsiveLayout'
import { useAuthStatus, useLogout } from '../../hooks/useAuth'
import { cn } from '../../utils/classNames'

export interface MainLayoutProps {
  className?: string
}

/**
 * MainLayout component that provides the application shell with header and content area.
 * Automatically detects authentication state and adjusts layout accordingly.
 * Now uses integrated header navigation instead of separate sidebar.
 * 
 * Requirements: 5.2, 5.3, 5.4 - Modern responsive navigation with pill-style desktop nav and mobile hamburger menu
 * Requirements: 3.2, 3.3, 3.5, 9.2 - Responsive layout adaptation and mobile optimization
 */
const MainLayout: React.FC<MainLayoutProps> = ({ className }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, isAuthenticated } = useAuthStatus()
  const logout = useLogout()

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleMenuClose = () => {
    setIsMobileMenuOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logout.mutateAsync()
      // Navigation is handled by the logout mutation
    } catch (error) {
      console.error('Logout failed:', error)
      // Navigation is handled by the logout mutation's onError
    }
  }

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header with integrated navigation */}
      <Header
        user={user}
        onMenuToggle={handleMenuToggle}
        onMenuClose={handleMenuClose}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        isLoading={logout.isPending}
      />

      {/* Main content area with responsive container */}
      <main className="flex-1">
        <ResponsiveContainer
          maxWidth={isAuthenticated ? 'xl' : 'lg'}
          padding="md"
          className="py-6"
        >
          {/* Breadcrumbs - only show for authenticated users */}
          {isAuthenticated && <Breadcrumbs className="mb-6" />}
          <Outlet />
        </ResponsiveContainer>
      </main>
    </div>
  )
}

export { MainLayout }