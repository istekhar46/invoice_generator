import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStatus } from '../hooks/useAuth'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * ProtectedRoute component that guards routes requiring authentication.
 * Redirects unauthenticated users to the login page.
 * 
 * Requirements: 8.3 - WHEN a user is not authenticated, THE System SHALL redirect to the login page
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
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
  
  if (!isAuthenticated) {
    // Redirect to login page, preserving the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  return <>{children}</>
}