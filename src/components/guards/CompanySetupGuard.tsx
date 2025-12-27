import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useCompanyProfileStatus } from '../../hooks/useCompany'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface CompanySetupGuardProps {
  children: React.ReactNode
}

/**
 * CompanySetupGuard component that ensures users have a company profile
 * before accessing certain features. Redirects to company setup if no profile exists.
 */
export const CompanySetupGuard: React.FC<CompanySetupGuardProps> = ({ children }) => {
  const location = useLocation()
  const { hasProfile, isLoading, error } = useCompanyProfileStatus()
  
  // Show loading while checking company profile status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    )
  }
  
  // If there's an error, let the user proceed (they can handle it in the component)
  if (error) {
    return <>{children}</>
  }
  
  // If no company profile exists, redirect to company setup
  if (!hasProfile) {
    return (
      <Navigate 
        to="/company?setup=true" 
        state={{ from: location.pathname }} 
        replace 
      />
    )
  }
  
  return <>{children}</>
}