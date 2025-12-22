import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Building2,
} from 'lucide-react'
import { cn } from '../../utils/classNames'

export interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  className?: string
  isAuthenticated?: boolean
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
    name: 'Customers',
    href: '/customers',
    icon: Users,
    requiresAuth: true,
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: FileText,
    requiresAuth: true,
  },
  {
    name: 'Company Profile',
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

const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  className,
  isAuthenticated = false,
}) => {
  // Filter navigation items based on authentication status
  const filteredNavigation = navigation.filter((item) => {
    if (item.requiresAuth && !isAuthenticated) {
      return false
    }
    return true
  })

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex h-16 items-center justify-center border-b border-gray-200 px-4">
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {isAuthenticated ? (
              filteredNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )
                  }
                  onClick={() => {
                    // Close mobile menu when navigation item is clicked
                    if (window.innerWidth < 1024) {
                      onClose?.()
                    }
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          'mr-3 h-5 w-5 flex-shrink-0',
                          isActive
                            ? 'text-blue-500'
                            : 'text-gray-400 group-hover:text-gray-500'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </>
                  )}
                </NavLink>
              ))
            ) : (
              <div className="px-2 py-4 text-center">
                <p className="text-sm text-gray-500">
                  Please log in to access navigation
                </p>
              </div>
            )}
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-gray-200 p-4">
            <p className="text-xs text-gray-500">
              Electrician Invoice Generator v1.0
            </p>
            {isAuthenticated && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Authenticated
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export { Sidebar }