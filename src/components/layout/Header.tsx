import React from 'react'
import { Menu, X, User, LogOut } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../utils/classNames'

export interface HeaderProps {
  user?: {
    displayName: string
    email: string
  } | null
  onMenuToggle?: () => void
  onLogout?: () => void
  isMobileMenuOpen?: boolean
  className?: string
  isLoading?: boolean
}

const Header: React.FC<HeaderProps> = ({
  user,
  onMenuToggle,
  onLogout,
  isMobileMenuOpen = false,
  className,
  isLoading = false,
}) => {
  const isAuthenticated = !!user

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm',
        className
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side - Logo and mobile menu button */}
        <div className="flex items-center">
          {/* Mobile menu button - only show when authenticated */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="small"
              className="mr-2 lg:hidden"
              onClick={onMenuToggle}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          )}

          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Invoice Generator
            </h1>
          </div>
        </div>

        {/* Right side - User actions */}
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          ) : isAuthenticated ? (
            <>
              {/* User info */}
              <div className="hidden sm:flex sm:items-center sm:space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>

              {/* Logout button */}
              <Button
                variant="ghost"
                size="small"
                onClick={onLogout}
                className="text-gray-600 hover:text-gray-900"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <span className="text-sm text-gray-500">Not signed in</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export { Header }