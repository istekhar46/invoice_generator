import React, { useEffect, useState } from 'react'
import { CompanyProfileForm } from '../components/features/company/CompanyProfileForm'
import { useCompanyProfile, useUploadLogo, useDeleteLogo } from '../hooks/useCompany'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ResponsiveContainer, ResponsiveGrid, ResponsiveStack } from '../components/layout/ResponsiveLayout'
import { 
  Building2, 
  Edit, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  DollarSign,
  Percent,
  ArrowRight,
  Plus,
  Upload,
  Trash2,
  RefreshCw
} from 'lucide-react'

/**
 * CompanyProfilePage component for managing company profile information with modern design.
 * 
 * Requirements: 2.1 - WHEN a user creates a company profile, THE System SHALL store business name, address, contact information, and tax number
 */
export const CompanyProfilePage: React.FC = () => {
  const { data: profile, isLoading: loading } = useCompanyProfile()
  const uploadLogo = useUploadLogo()
  const deleteLogo = useDeleteLogo()
  const [isEditing, setIsEditing] = useState(false)

  // If no profile exists, show form by default
  useEffect(() => {
    if (!loading && !profile) {
      setIsEditing(true)
    }
  }, [loading, profile])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSuccess = () => {
    setIsEditing(false)
    console.log('Company profile saved successfully')
  }

  const handleCancel = () => {
    setIsEditing(false)
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

  if (loading && !profile) {
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

  // Show form when editing or no profile exists
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
        <ResponsiveContainer maxWidth="xl" padding="md" className="py-6">
          <ResponsiveStack spacing="lg" className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="heading-2 text-gray-900">
                  {profile ? 'Edit Company Profile' : 'Setup Company Profile'}
                </h1>
                <p className="text-body text-gray-600">
                  {profile 
                    ? 'Update your business information and default rates'
                    : 'Set up your company profile to get started with invoicing'
                  }
                </p>
              </div>
            </div>

            {!profile && (
              <Card padding="lg" className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-primary-100 rounded-xl">
                    <Building2 className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-primary-900">
                      Complete Your Company Profile
                    </h3>
                    <p className="mt-1 text-sm text-primary-700">
                      Your company information will appear on all invoices. Make sure to provide accurate details.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <CompanyProfileForm onSuccess={handleSuccess} onCancel={profile ? handleCancel : undefined} />
          </ResponsiveStack>
        </ResponsiveContainer>
      </div>
    )
  }

  // Show profile details view
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      <ResponsiveContainer maxWidth="xl" padding="md" className="py-6">
        <ResponsiveStack spacing="lg" className="animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="heading-2 text-gray-900">Company Profile</h1>
                <p className="text-body text-gray-600">
                  Your business information and default settings
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleEdit} 
              variant="primary"
              size="lg"
              className="group shadow-glow"
            >
              <Edit className="h-5 w-5 mr-2" />
              Edit Profile
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {/* Company Details Grid */}
          <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="lg">
            {/* Business Information */}
            <Card padding="lg" hover={true} className="bg-gradient-to-br from-white to-gray-50/50">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="heading-4 text-gray-900">Business Information</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Business Name</p>
                    <p className="text-base font-semibold text-gray-900">{profile?.businessName}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tax Number</p>
                    <p className="text-base text-gray-900">{profile?.taxNumber || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact Information */}
            <Card padding="lg" hover={true} className="bg-gradient-to-br from-white to-gray-50/50">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-success-600 to-success-500 rounded-xl">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="heading-4 text-gray-900">Contact Information</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-base text-gray-900">{profile?.phone}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-base text-gray-900">{profile?.email}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Address Information */}
            <Card padding="lg" hover={true} className="bg-gradient-to-br from-white to-gray-50/50">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-secondary-600 to-secondary-500 rounded-xl">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="heading-4 text-gray-900">Address</h3>
                </div>
                
                <div className="space-y-1">
                  <p className="text-base text-gray-900">{profile?.address}</p>
                  <p className="text-base text-gray-900">
                    {profile?.city}, {profile?.state} {profile?.zipCode}
                  </p>
                </div>
              </div>
            </Card>

            {/* Default Rates */}
            <Card padding="lg" hover={true} className="bg-gradient-to-br from-white to-gray-50/50">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="heading-4 text-gray-900">Default Labor Rate</h3>
                </div>
                
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-gray-900">
                    ${profile?.defaultLaborRate}
                  </span>
                  <span className="text-sm text-gray-500">per hour</span>
                </div>
              </div>
            </Card>

            {/* Tax Rate */}
            <Card padding="lg" hover={true} className="bg-gradient-to-br from-white to-gray-50/50">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl">
                    <Percent className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="heading-4 text-gray-900">Default Tax Rate</h3>
                </div>
                
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-gray-900">
                    {profile?.defaultTaxRate}%
                  </span>
                  <span className="text-sm text-gray-500">tax rate</span>
                </div>
              </div>
            </Card>

            {/* Logo Section */}
            <Card padding="lg" hover={true} className="bg-gradient-to-br from-white to-gray-50/50">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-pink-600 to-pink-500 rounded-xl">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="heading-4 text-gray-900">Company Logo</h3>
                </div>
                
                <div className="space-y-3">
                  {profile?.logoUrl ? (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <img 
                          src={profile.logoUrl} 
                          alt="Company Logo" 
                          className="max-h-20 max-w-full rounded-lg shadow-sm border border-gray-200 bg-white p-2"
                        />
                      </div>
                      
                      <div className="flex flex-wrap gap-2 justify-center">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif"
                          onChange={handleLogoFileSelect}
                          className="sr-only"
                          id="logo-upload"
                          disabled={uploadLogo.isPending || deleteLogo.isPending}
                        />
                        
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={uploadLogo.isPending || deleteLogo.isPending}
                        >
                          {uploadLogo.isPending ? (
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3 mr-1" />
                          )}
                          Replace
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="small"
                          onClick={handleLogoDelete}
                          disabled={uploadLogo.isPending || deleteLogo.isPending}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        >
                          {deleteLogo.isPending ? (
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3 mr-1" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="p-4 bg-gray-100 rounded-xl">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 mb-3">No logo uploaded</p>
                        
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif"
                          onChange={handleLogoFileSelect}
                          className="sr-only"
                          id="logo-upload-empty"
                          disabled={uploadLogo.isPending}
                        />
                        
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => document.getElementById('logo-upload-empty')?.click()}
                          disabled={uploadLogo.isPending}
                        >
                          {uploadLogo.isPending ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Upload Logo
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {(uploadLogo.error || deleteLogo.error) && (
                    <div className="text-center">
                      <p className="text-xs text-red-600">
                        {uploadLogo.error instanceof Error ? uploadLogo.error.message : 
                         deleteLogo.error instanceof Error ? deleteLogo.error.message : 
                         'An error occurred'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </ResponsiveGrid>

          {/* Quick Actions */}
          <Card padding="lg" className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to create invoices?
                </h3>
                <p className="text-sm text-gray-600">
                  Your company profile is complete. Start generating professional invoices for your clients.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => window.location.href = '/invoices'}
                className="group"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Invoice
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </Card>
        </ResponsiveStack>
      </ResponsiveContainer>
    </div>
  )
}