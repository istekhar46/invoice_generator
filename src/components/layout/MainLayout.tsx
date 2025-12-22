import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { Breadcrumbs } from './Breadcrumbs'
import { ResponsiveContainer } from './ResponsiveLayout'
import { useAuthStore } from '../../store/authStore'
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
  const navigate = useNavigate()
  const { user, isAuthenticated, loading, logout, loadUser } = useAuthStore()

  // Load user session on mount
  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
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
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header with integrated navigation */}
      <Header
        user={user}
        onMenuToggle={handleMenuToggle}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        isLoading={loading}
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