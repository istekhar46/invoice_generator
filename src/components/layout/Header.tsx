import React, { useState } from 'react'
import { Menu, X, User, LogOut, LayoutDashboard, Users, FileText, Settings, Building2 } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '../ui/Button'
import { cn } from '../../utils/classNames'
import logo from  '../../assets/logo_2.jpg'

export interface HeaderProps {
  user?: {
    displayName: string
    email: string
  } | null
  onMenuToggle?: () => void
  onMenuClose?: () => void
  onLogout?: () => void
  isMobileMenuOpen?: boolean
  className?: string
  isLoading?: boolean
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiresAuth?: boolean
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    requiresAuth: true,
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: FileText,
    requiresAuth: true,
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: Users,
    requiresAuth: true,
  },
  {
    name: 'Company',
    href: '/company',
    icon: Building2,
    requiresAuth: true,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    requiresAuth: true,
  },
]

const Header: React.FC<HeaderProps> = ({
  user,
  onMenuToggle,
  onMenuClose,
  onLogout,
  isMobileMenuOpen = false,
  className,
  isLoading = false,
}) => {
  const isAuthenticated = !!user
  const [localMobileMenuOpen, setLocalMobileMenuOpen] = useState(false)

  // Use local state if onMenuToggle is not provided
  const mobileMenuOpen = onMenuToggle ? isMobileMenuOpen : localMobileMenuOpen
  
  const handleMenuToggle = () => {
    if (onMenuToggle) {
      onMenuToggle()
    } else {
      setLocalMobileMenuOpen(!localMobileMenuOpen)
    }
  }

  const handleMenuClose = () => {
    if (onMenuClose) {
      onMenuClose()
    } else {
      setLocalMobileMenuOpen(false)
    }
  }

  // Filter navigation items based on authentication status
  const filteredNavigation = navigation.filter((item) => {
    if (item.requiresAuth && !isAuthenticated) {
      return false
    }
    return true
  })

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full',
        // Glass morphism effect
        'bg-white/80 backdrop-blur-lg',
        'border-b border-white/20',
        'shadow-soft',
        className
      )}
    >
      <div className="flex h-16 sm:h-20 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Left side - Logo and mobile menu button */}
        <div className="flex items-center space-x-3">
          {/* Mobile menu button - only show when authenticated */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="small"
              className="mr-2 md:hidden min-h-11 min-w-11"
              onClick={handleMenuToggle}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </Button>
          )}

          {/* Modern Logo with gradient and hover animations */}
          <Link 
            to={isAuthenticated ? "/dashboard" : "/"} 
            className="flex items-center space-x-1 group"
          >
            <div className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-105 w-[30%]">
              {/* <Zap className="w-6 h-6 text-white" /> */}
              <img src={logo} alt="logo" className='w-full mix-blend-multiply' />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold bg-linear-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                Invoiceo
              </span>
              <p className="text-xs text-gray-500">Invoicing Services</p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation - Modern pill style */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-2xl p-2">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 min-h-11',
                    isActive
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        )}

        {/* Right side - User actions */}
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          ) : isAuthenticated ? (
            <>
              {/* User info */}
              <div className="hidden sm:flex sm:items-center sm:space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary-100 to-primary-200">
                  <User className="h-4 w-4 text-primary-600" />
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
                className="text-gray-600 hover:text-gray-900 min-h-11"
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

      {/* Mobile Navigation - Slide down animation */}
      {isAuthenticated && mobileMenuOpen && (
        <nav className="md:hidden py-4 border-t border-gray-200 animate-slide-down bg-white/90 backdrop-blur-lg">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={handleMenuClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 mb-1 min-h-11 mx-4',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}

export { Header }