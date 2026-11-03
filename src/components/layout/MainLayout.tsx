import React, { useCallback, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { SiteMetadata } from '../seo/SiteMetadata'
import { Footer } from './Footer'
import { Breadcrumbs } from './Breadcrumbs'
import { ResponsiveContainer } from './ResponsiveLayout'
import { useAuthStatus, useLogout } from '../../hooks/useAuth'
import { cn } from '../../utils/classNames'

export interface MainLayoutProps {
  className?: string
}

/**
 * Signed-in accounts receive desktop navigation and a modal mobile drawer.
 * Public pages retain the header/content shell.
 */
const MainLayout: React.FC<MainLayoutProps> = ({ className }) => {
  const location = useLocation()
  const { user, isAuthenticated } = useAuthStatus()
  const logout = useLogout()

  // Dismiss on every navigation, including query-only history changes.
  const menuKey = `${user?.id ?? ''}:${location.key}`
  const [menu, setMenu] = useState({ key: menuKey, open: false })
  if (menu.key !== menuKey) setMenu({ key: menuKey, open: false })
  const isMobileMenuOpen = isAuthenticated && menu.key === menuKey && menu.open
  const handleMenuToggle = () =>
    setMenu({ key: menuKey, open: !isMobileMenuOpen })

  const handleMenuClose = useCallback(() => {
    setMenu(current => (current.open ? { ...current, open: false } : current))
  }, [])

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
    <div className={cn('min-h-screen flex flex-col bg-gray-50', className)}>
      <SiteMetadata pathname={location.pathname} />
      <Header
        user={isAuthenticated ? user : null}
        onMenuToggle={handleMenuToggle}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        isLoading={logout.isPending}
      />

      <div className="flex flex-1">
        {isAuthenticated && (
          <Sidebar isOpen={isMobileMenuOpen} onClose={handleMenuClose} />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1" id="main-content">
            {isAuthenticated && (
              <ResponsiveContainer
                padding="none"
                className="px-4 pt-4 sm:px-6 lg:px-8"
              >
                <Breadcrumbs />
              </ResponsiveContainer>
            )}
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

export { MainLayout }
