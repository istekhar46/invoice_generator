import React from 'react'
import { Building2, ArrowRight, Users, FileText, Settings } from 'lucide-react'
import { Button } from '../../ui/Button'
import { Card, CardContent } from '../../ui/Card'
import { ResponsiveContainer, ResponsiveGrid } from '../../layout/ResponsiveLayout'

interface CompanySetupWelcomeProps {
  onGetStarted: () => void
}

const features = [
  {
    icon: FileText,
    title: 'Professional Invoices',
    description: 'Create and send professional invoices with your company branding'
  },
  {
    icon: Users,
    title: 'Customer Management',
    description: 'Keep track of your customers and their contact information'
  },
  {
    icon: Settings,
    title: 'Business Settings',
    description: 'Set default rates, tax information, and business preferences'
  }
]

export const CompanySetupWelcome: React.FC<CompanySetupWelcomeProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <ResponsiveContainer className="py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Welcome Header */}
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-6">
              <Building2 className="w-10 h-10 text-primary-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Your Business Hub
            </h1>
            <p className="text-xl text-gray-600 max-w -2xl mx-auto">
              Let's set up your company profile to get started with professional invoicing, 
              customer management, and business tools.
            </p>
          </div>

          {/* Features Grid */}
          <ResponsiveGrid className="mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardContent>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                    <feature.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGrid>

          {/* Setup Steps */}
          <Card className="mb-8 p-6 bg-white/80 backdrop-blur-sm">
            <CardContent>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Quick Setup - Just 3 Steps
              </h2>
              <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary-600 text-white rounded-full text-sm font-semibold">
                    1
                  </div>
                  <span className="text-gray-700">Business Information</span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 hidden md:block" />
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary-600 text-white rounded-full text-sm font-semibold">
                    2
                  </div>
                  <span className="text-gray-700">Contact Details</span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 hidden md:block" />
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary-600 text-white rounded-full text-sm font-semibold">
                    3
                  </div>
                  <span className="text-gray-700">Business Settings</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Button */}
          <Button 
            onClick={onGetStarted}
            size="lg"
            className="px-8 py-4 text-lg font-semibold"
          >
            Get Started
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <p className="text-sm text-gray-500 mt-4">
            Takes less than 5 minutes to complete
          </p>
        </div>
      </ResponsiveContainer>
    </div>
  )
}