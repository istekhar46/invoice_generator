import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { CompanyProfileForm } from '../components/features/company/CompanyProfileForm'
import { CompanySetupWelcome } from '../components/features/company/CompanySetupWelcome'
import { CompanyDashboard } from '../components/features/company/CompanyDashboard'
import { useCompanyProfile, useUploadLogo, useDeleteLogo } from '../hooks/useCompany'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'

/**
 * CompanyProfilePage component for managing company profile information with modern design.
 * Handles both initial setup flow and profile management.
 * 
 * Requirements: 2.1 - WHEN a user creates a company profile, THE System SHALL store business name, address, contact information, and tax number
 */
export const CompanyProfilePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: profile, isLoading: loading, error } = useCompanyProfile()
  const uploadLogo = useUploadLogo()
  const deleteLogo = useDeleteLogo()
  const [isEditing, setIsEditing] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const isSetupMode = searchParams.get('setup') === 'true'

  // Reset state when location changes (navigation)
  useEffect(() => {
    setInitialized(false)
    setIsEditing(false)
    setShowWelcome(false)
  }, [location.pathname])

  // Determine what to show based on profile state and URL params
  useEffect(() => {
    // Only initialize once when loading is complete and we haven't initialized yet
    if (!loading && !initialized && !error) {
      // Check if profile doesn't exist (null or undefined)
      if (!profile) {
        // No profile exists
        if (isSetupMode) {
          setShowWelcome(true)
          setIsEditing(false)
        } else {
          setShowWelcome(false)
          setIsEditing(true)
        }
      } else {
        // Profile exists
        setShowWelcome(false)
        setIsEditing(false)
      }
      setInitialized(true)
    }
  }, [loading, profile, isSetupMode, initialized, error])

  const handleGetStarted = () => {
    setShowWelcome(false)
    setIsEditing(true)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSuccess = () => {
    const wasCreating = !profile
    setIsEditing(false)
    setShowWelcome(false)
    setInitialized(false) // Reset initialization to allow re-evaluation
    // Clear setup parameter from URL
    navigate('/company', { replace: true })
    
    // If we just created a profile, show a message about adding logo
    if (wasCreating) {
      console.log('Company profile created successfully - you can now add a logo')
    }
  }

  const handleCancel = () => {
    if (!profile) {
      // If no profile exists and user cancels, show welcome screen
      setShowWelcome(true)
      setIsEditing(false)
    } else {
      // If profile exists, just exit edit mode
      setIsEditing(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    try {
      await uploadLogo.mutateAsync(file)
    } catch (error) {
      console.error('Logo upload failed:', error)
    }
  }

  const handleLogoDelete = async () => {
    try {
      await deleteLogo.mutateAsync()
    } catch (error) {
      console.error('Logo deletion failed:', error)
    }
  }

  const handleLogoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleLogoUpload(file)
    }
  }

  // Show loading while fetching profile data or not yet initialized
  if (loading || !initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
        <ResponsiveContainer maxWidth="xl" padding="md" className="py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="large" label="Loading company profile..." />
          </div>
        </ResponsiveContainer>
      </div>
    )
  }

  // Show welcome screen for first-time setup (no profile + setup mode)
  if (!profile && showWelcome && !isEditing) {
    return <CompanySetupWelcome onGetStarted={handleGetStarted} />
  }

  // Show form when editing or no profile exists (and not showing welcome)
  if (!profile || isEditing) {
    return (
      <CompanyProfileForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    )
  }

  // Show company dashboard when profile exists and not editing
  if (profile && !isEditing) {
    return (
      <CompanyDashboard
        profile={profile}
        onEdit={handleEdit}
        onLogoUpload={handleLogoFileSelect}
        onLogoDelete={handleLogoDelete}
        isUploadingLogo={uploadLogo.isPending}
        isDeletingLogo={deleteLogo.isPending}
      />
    )
  }

  // Fallback - should not reach here
  return null
}