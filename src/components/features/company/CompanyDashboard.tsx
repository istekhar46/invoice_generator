import React from 'react'
import { 
  Building2, 
  Edit, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  DollarSign,
  Upload,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { ResponsiveContainer, ResponsiveGrid, ResponsiveStack } from '../../layout/ResponsiveLayout'
import type { CompanyProfileResponseDto } from '../../../services/api'

interface CompanyDashboardProps {
  profile: CompanyProfileResponseDto
  onEdit: () => void
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onLogoDelete: () => void
  isUploadingLogo?: boolean
  isDeletingLogo?: boolean
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  profile,
  onEdit,
  onLogoUpload,
  onLogoDelete,
  isUploadingLogo = false,
  isDeletingLogo = false,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      <ResponsiveContainer maxWidth="xl" padding="md" className="py-6">
        <ResponsiveStack spacing="lg" className="animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="heading-2 text-gray-900">Company Profile</h1>
                <p className="text-body text-gray-600">
                  Manage your business information and settings
                </p>
              </div>
            </div>
            <Button onClick={onEdit} className="group">
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>

          {/* Company Logo Section */}
          <Card className="overflow-hidden" padding='none'>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Company Logo</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex-shrink-0">
                  {profile.logoUrl ? (
                    <img
                      src={profile.logoUrl}
                      alt={`${profile.businessName} logo`}
                      className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {profile.businessName}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {profile.logoUrl 
                      ? 'Your company logo is displayed on invoices and documents'
                      : '📸 Add a logo to make your invoices more professional and build brand recognition'
                    }
                  </p>
                  {!profile.logoUrl && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Tip:</strong> A professional logo helps customers recognize your business and adds credibility to your invoices.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {!profile.logoUrl ? (
                      <>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onLogoUpload}
                          className="hidden"
                          disabled={isUploadingLogo}
                          id="logo-upload-input"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUploadingLogo}
                          className="group"
                          onClick={() => document.getElementById('logo-upload-input')?.click()}
                        >
                          {isUploadingLogo ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Upload Logo
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onLogoDelete}
                        disabled={isDeletingLogo}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {isDeletingLogo ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information Grid */}
          <ResponsiveGrid>
            {/* Business Information */}
            <Card padding='none' className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Business Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Business Name</label>
                  <p className="text-gray-900 font-medium">{profile.businessName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tax Number</label>
                  <p className="text-gray-900">{profile.taxNumber}</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card padding='none' className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Contact Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{profile.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{profile.phone}</span>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card padding='none' className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Address</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-900">
                  <p>{profile.address}</p>
                  <p>{profile.city}, {profile.state} {profile.zipCode}</p>
                </div>
              </CardContent>
            </Card>

            {/* Default Rates */}
            <Card padding='none' className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Default Rates</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Labor Rate</span>
                  <span className="text-gray-900 font-medium">${profile.defaultLaborRate}/hr</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tax Rate</span>
                  <span className="text-gray-900 font-medium">{(profile.defaultTaxRate * 100).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Profile Dates */}
            <Card padding='none' className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Profile Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-gray-900">{profile.createdAt.toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-gray-900">{profile.updatedAt.toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </ResponsiveGrid>
        </ResponsiveStack>
      </ResponsiveContainer>
    </div>
  )
}