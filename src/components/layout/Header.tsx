import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  ChevronRight,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '../ui/Button'
import { cn } from '../../utils/classNames'
import logo from '../../assets/logo_3.png'

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
  description: string
  icon: React.ComponentType<{ className?: string }>
  requiresAuth?: boolean
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    description: 'Your business at a glance',
    icon: LayoutDashboard,
    requiresAuth: true,
  },
  {
    name: 'Invoices',
    href: '/invoices',
    description: 'Create and manage your billing',
    icon: FileText,
    requiresAuth: true,
  },

  {
    name: 'Customers',
    href: '/customers',
    description: 'Keep your client details together',
    icon: Users,
    requiresAuth: true,
  },
  {
    name: 'Company',
    href: '/company',
    description: 'Business profile and branding',
    icon: Building2,
    requiresAuth: true,
  },
  // Settings navigation is temporarily disabled.
  // Restore the Settings icon import and navigation item when the page is re-enabled.
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
  const menuButtonRef = useRef<HTMLButtonElement>(null)
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
  const filteredNavigation = navigation.filter(item => {
    if (item.requiresAuth && !isAuthenticated) {
      return false
    }
    return true
  })

  return (
    <header
      onKeyDown={(event) => {
        if (mobileMenuOpen && event.key === 'Escape') {
          handleMenuClose()
          menuButtonRef.current?.focus()
        }
      }}
      className={cn(
        'sticky top-0 z-40 w-full',
        // Glass morphism effect
        'bg-white/80 backdrop-blur-lg',
        'border-b border-white/20',
        'shadow-soft',
        className
      )}
    >
      <div className="flex h-16 sm:h-20 items-center justify-between px-4 gap-2 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Left side - Logo and mobile menu button */}
        <div className="flex items-center space-x-3">
          {/* Mobile menu button - only show when authenticated */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="small"
              ref={menuButtonRef}
              className={cn(
                'md:hidden min-h-11 min-w-11 px-3 border shadow-none',
                mobileMenuOpen
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600'
              )}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
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
          <div className="flex justify-items-start items-center space-x-1 group">
            <Link to={isAuthenticated ? '/dashboard' : '/'}>
              <div className="rounded-xl transition-all duration-300 group-hover:scale-105">
                {/* <Zap className="w-6 h-6 text-white" /> */}
                <img
                  src={logo}
                  alt="Invoiceo home"
                  className="w-24 md:w-32 mix-blend- multiply"
                />
              </div>
            </Link>
            {/* <div className="hidden sm:block">
              <span className="text-xl font-bold bg-linear-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                Invoiceo
              </span>
              <p className="text-xs text-gray-500">Invoicing Services</p>
            </div> */}
          </div>
        </div>

        {/* Desktop Navigation - Modern pill style */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-2xl p-2">
            {filteredNavigation.map(item => (
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

      {/* Mobile workspace navigation */}
      {isAuthenticated && mobileMenuOpen && (
        <>
          {createPortal(
            <button
              type="button"
              aria-label="Close navigation backdrop"
              tabIndex={-1}
              onClick={() => {
                handleMenuClose()
                menuButtonRef.current?.focus()
              }}
              className="fixed inset-x-0 bottom-0 top-16 z-30 bg-gray-900/30 backdrop-blur-sm md:hidden sm:top-20"
            />,
            document.body
          )}
          <div className="absolute inset-x-0 top-full md:hidden px-3 pb-3 pt-2 sm:px-6 motion-safe:animate-slide-down">
          <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-hard">
            <div className="flex items-center gap-3 bg-linear-to-br from-gray-900 to-primary-950 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <User className="h-5 w-5 text-primary-200" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user.displayName}</p>
                <p className="truncate text-xs text-gray-300">{user.email}</p>
              </div>
            </div>
            <nav id="mobile-navigation" aria-label="Mobile navigation" className="space-y-1 p-2">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Workspace</p>
              {filteredNavigation.map(item => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={handleMenuClose}
                  className={({ isActive }) => cn(
                    'group flex min-h-16 items-center gap-3 rounded-xl px-3 py-3 transition-colors focus-ring-inset',
                    isActive
                      ? 'bg-linear-to-r from-primary-600 to-primary-500 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        isActive ? 'bg-white/15' : 'bg-gray-100 text-gray-500 group-hover:bg-primary-50 group-hover:text-primary-600'
                      )}>
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{item.name}</span>
                        <span className={cn('block text-xs', isActive ? 'text-primary-100' : 'text-gray-500')}>{item.description}</span>
                      </span>
                      <ChevronRight className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-gray-400')} aria-hidden="true" />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="flex gap-4 border-t border-gray-100 bg-gray-50/70 px-5 py-2 text-xs">
              <Link to="/help" onClick={handleMenuClose} className="text-link inline-flex min-h-11 items-center">Help</Link>
              <Link to="/about" onClick={handleMenuClose} className="text-link inline-flex min-h-11 items-center">About Invoiceo</Link>
            </div>
          </div>
        </div>
        </>
      )}
    </header>
  )
}

export { Header }
