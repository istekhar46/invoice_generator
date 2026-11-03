import { useEffect } from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react'
import { Link, NavLink } from 'react-router-dom'
import {
  Building2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Package,
  Plus,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '../../utils/classNames'

export interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigationGroups = [
  {
    name: 'Workspace',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    name: 'Sales',
    items: [
      { name: 'Invoices', href: '/invoices', icon: FileText },
      { name: 'Quick Invoice', href: '/quick-invoice', icon: Zap },
    ],
  },
  {
    name: 'Business',
    items: [
      { name: 'Products & Services', href: '/products', icon: Package },
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Company Profile', href: '/company', icon: Building2 },
    ],
  },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="p-4">
        <Link
          to="/invoices?create=true"
          onClick={onNavigate}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-ring"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Invoice
        </Link>
      </div>
      <nav
        aria-label="Workspace"
        className="flex-1 space-y-6 overflow-y-auto px-3 pb-6"
      >
        {navigationGroups.map(group => (
          <div key={group.name}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              {group.name}
            </p>
            <ul className="space-y-1">
              {group.items.map(item => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-ring-inset',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )
                    }
                  >
                    <item.icon
                      className="h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <Link
          to="/help"
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-600 hover:bg-gray-100 focus-ring-inset"
        >
          <HelpCircle className="h-5 w-5" aria-hidden="true" />
          Help & Support
        </Link>
      </div>
    </>
  )
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  // Release modal focus/scroll lock when desktop navigation takes over.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => {
      if (desktop.matches) onClose()
    }
    if (isOpen) closeOnDesktop()
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [isOpen, onClose])

  return (
    <>
      <aside
        aria-label="Console sidebar"
        className="sticky top-20 hidden h-[calc(100dvh-5rem)] w-64 shrink-0 flex-col self-start border-r border-gray-200 bg-white lg:flex no-print"
      >
        <SidebarContent />
      </aside>
      <Dialog
        open={isOpen}
        onClose={onClose}
        className="fixed inset-0 z-50 lg:hidden no-print"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex">
          <DialogPanel
            id="console-navigation"
            className="flex h-dvh w-72 max-w-[calc(100vw-3rem)] flex-col bg-white shadow-xl"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-5 sm:h-20">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Your workspace
              </DialogTitle>
              <button
                type="button"
                data-autofocus
                onClick={onClose}
                aria-label="Close menu"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 focus-ring-inset"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent onNavigate={onClose} />
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
