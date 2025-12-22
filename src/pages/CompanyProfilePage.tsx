import React, { useEffect } from 'react'
import { CompanyProfileForm } from '../components/features/company/CompanyProfileForm'
import { useCompanyStore } from '../store/companyStore'
import { useAuthStore } from '../store/authStore'
import { Card, CardContent } from '../components/ui/Card'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Building2 } from 'lucide-react'

/**
 * CompanyProfilePage component for managing company profile information.
 * 
 * Requirements: 2.1 - WHEN a user creates a company profile, THE System SHALL store business name, address, contact information, and tax number
 */
export const CompanyProfilePage: React.FC = () => {
  const { user } = useAuthStore()
  const { profile, loading, loadProfile } = useCompanyStore()

  // Load company profile on mount
  useEffect(() => {
    if (user?.id) {
      loadProfile(user.id)
    }
  }, [user?.id, loadProfile])

  const handleSuccess = () => {
    // Optionally show a success message or redirect
    console.log('Company profile saved successfully')
  }

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="large" label="Loading company profile..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {profile 
              ? 'Update your business information and default rates'
              : 'Set up your company profile to get started with invoicing'
            }
          </p>
        </div>
      </div>

      {!profile && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Complete Your Company Profile
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  Your company information will appear on all invoices. Make sure to provide accurate details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <CompanyProfileForm onSuccess={handleSuccess} />
    </div>
  )
}