import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

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
  
  if (!isAuthenticated) {
    // Redirect to login page, preserving the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  return <>{children}</>
}