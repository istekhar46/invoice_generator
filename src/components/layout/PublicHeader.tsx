import {
  CloseButton,
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react'
import { Menu, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../../assets/logo_3.png'
import { cn } from '../../utils/classNames'

const links = [
  { label: 'Invoice generator', to: '/#invoice-editor' },
  { label: 'Features', to: '/#features' },
  { label: 'How it works', to: '/#invoice-how-to' },
  { label: 'Help', to: '/help' },
]
const linkClass =
  'min-h-11 items-center rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-600 focus-ring'
const createClass =
  'inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-ring sm:px-5'

export function PublicHeader({ className }: { className?: string }) {
  const location = useLocation()
  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-lg no-print',
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0 })}
          className="shrink-0 rounded-lg focus-ring"
        >
          <img src={logo} alt="Invoiceo home" className="w-24 md:w-32" />
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(linkClass, 'inline-flex')}
              aria-current={
                `${location.pathname}${location.hash}` === link.to
                  ? location.hash
                    ? 'location'
                    : 'page'
                  : undefined
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className={cn(linkClass, 'hidden sm:inline-flex')}>
            Sign in
          </Link>
          <Link to="/#invoice-editor" className={createClass}>
            Create invoice
          </Link>
          <Popover key={location.key} className="lg:hidden">
            {({ open }) => (
              <>
                <PopoverButton
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 focus-ring"
                  aria-label={open ? 'Close navigation' : 'Open navigation'}
                >
                  {open ? (
                    <X className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  )}
                </PopoverButton>
                <PopoverPanel
                  focus
                  className="absolute inset-x-4 top-full mt-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl sm:left-auto sm:right-6 sm:w-80 lg:hidden"
                >
                  <nav
                    aria-label="Mobile navigation"
                    className="flex flex-col gap-1"
                  >
                    {links.map(link => (
                      <CloseButton
                        as={Link}
                        key={link.to}
                        to={link.to}
                        className={cn(linkClass, 'flex')}
                      >
                        {link.label}
                      </CloseButton>
                    ))}
                    <div className="mt-2 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                      <CloseButton
                        as={Link}
                        to="/login"
                        className={cn(
                          linkClass,
                          'inline-flex justify-center border border-gray-200'
                        )}
                      >
                        Sign in
                      </CloseButton>
                      <CloseButton
                        as={Link}
                        to="/signup"
                        className={createClass}
                      >
                        Create account
                      </CloseButton>
                    </div>
                  </nav>
                </PopoverPanel>
              </>
            )}
          </Popover>
        </div>
      </div>
    </header>
  )
}
