import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStatus } from '../hooks/useAuth'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

interface PublicRouteProps {
  children: React.ReactNode
}

/**
 * PublicRoute component that guards public routes (login, signup).
 * Redirects authenticated users to the dashboard.
 * 
 * Requirements: 8.4 - WHEN a user is authenticated, THE System SHALL prevent access to login/signup pages
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuthStatus()
  
  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    )
  }
  
  if (isAuthenticated) {
    // Redirect to dashboard or the originally requested page
    const from = (location.state as any)?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }
  
  return <>{children}</>
}