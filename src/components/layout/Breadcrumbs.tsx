import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { routeMetadata, type RouteKey } from '../../routes'
import { cn } from '../../utils/classNames'

export interface BreadcrumbsProps {
  className?: string
}

/**
 * Breadcrumbs component that shows the current navigation path.
 * Automatically generates breadcrumbs based on the current route.
 * 
 * Requirements: 8.2 - THE System SHALL provide navigation to customers, invoices, and settings pages
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ className }) => {
  const location = useLocation()
  const currentPath = location.pathname
  
  // Don't show breadcrumbs on login/signup pages or root
  if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/') {
    return null
  }
  
  const currentRoute = routeMetadata[currentPath as RouteKey]
  
  // If we don't have metadata for this route, don't show breadcrumbs
  if (!currentRoute) {
    return null
  }
  
  return (
    <nav className={cn('flex items-center space-x-2 text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {/* Home/Dashboard link */}
        <li>
          <Link
            to="/dashboard"
            className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Dashboard</span>
          </Link>
        </li>
        
        {/* Current page (only show if not dashboard) */}
        {currentPath !== '/dashboard' && currentRoute && (
          <>
            <li>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </li>
            <li>
              <span className="font-medium text-gray-900" aria-current="page">
                {currentRoute.breadcrumb}
              </span>
            </li>
          </>
        )}
      </ol>
    </nav>
  )
}