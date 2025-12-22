import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

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
  const { isAuthenticated, loading, loadUser } = useAuthStore()
  
  // Load user session on mount
  useEffect(() => {
    loadUser()
  }, [loadUser])
  
  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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