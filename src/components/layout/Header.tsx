import type { FC } from 'react'
import { Menu, User, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { cn } from '../../utils/classNames'
import logo from '../../assets/logo_3.png'

export interface HeaderProps {
  user?: { displayName: string; email: string } | null
  onMenuToggle?: () => void
  onLogout?: () => void
  isMobileMenuOpen?: boolean
  className?: string
  isLoading?: boolean
}

const Header: FC<HeaderProps> = ({
  user,
  onMenuToggle,
  onLogout,
  isMobileMenuOpen = false,
  className,
  isLoading = false,
}) => (
  <header
    className={cn(
      'sticky top-0 z-40 w-full border-b border-white/20 bg-white/80 shadow-soft backdrop-blur-lg no-print',
      className
    )}
  >
    <div
      className={cn(
        'mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8',
        !user && 'max-w-7xl'
      )}
    >
      <div className="flex items-center gap-3">
        {user && (
          <Button
            variant="ghost"
            size="small"
            className="min-h-11 min-w-11 border border-gray-200 px-3 text-gray-600 shadow-none lg:hidden"
            aria-expanded={isMobileMenuOpen}
            aria-controls={isMobileMenuOpen ? 'console-navigation' : undefined}
            aria-label="Open menu"
            onClick={onMenuToggle}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </Button>
        )}
        <Link to={user ? '/dashboard' : '/'} className="rounded-lg focus-ring">
          <img src={logo} alt="Invoiceo home" className="w-24 md:w-32" />
        </Link>
        {user && (
          <span className="hidden border-l border-gray-200 pl-5 text-sm font-medium text-gray-500 lg:block">
            Workspace
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {isLoading ? (
          <div
            role="status"
            className="flex items-center gap-2 text-sm text-gray-500"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            Signing out...
          </div>
        ) : user ? (
          <>
            <div className="hidden min-w-0 items-center gap-3 sm:flex">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <User className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="hidden min-w-0 lg:block">
                <p className="max-w-48 truncate text-sm font-medium text-gray-900">
                  {user.displayName}
                </p>
                <p className="max-w-48 truncate text-xs text-gray-500">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="small"
              onClick={onLogout}
              className="min-h-11 text-gray-600"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="ml-2 hidden sm:inline">Logout</span>
            </Button>
          </>
        ) : (
          <span className="text-sm text-gray-500">Not signed in</span>
        )}
      </div>
    </div>
  </header>
)

export { Header }
