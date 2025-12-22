import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ResponsiveContainer, ResponsiveGrid, ResponsiveStack } from '../components/layout/ResponsiveLayout'
import { 
  Settings, 
  Building2, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  ArrowRight,
  Zap
} from 'lucide-react'

/**
 * SettingsPage component for application settings with modern design.
 */
export const SettingsPage: React.FC = () => {
  const navigate = useNavigate()

  const settingsCategories = [
    {
      title: 'Company Profile',
      description: 'Manage your business information and branding',
      icon: Building2,
      gradient: 'from-primary-600 to-primary-500',
      path: '/company',
      available: true
    },
    {
      title: 'Account Settings',
      description: 'Update your personal account information',
      icon: User,
      gradient: 'from-success-600 to-success-500',
      path: '/account',
      available: false
    },
    {
      title: 'Notifications',
      description: 'Configure email and push notification preferences',
      icon: Bell,
      gradient: 'from-secondary-600 to-secondary-500',
      path: '/notifications',
      available: false
    },
    {
      title: 'Security',
      description: 'Manage passwords, two-factor authentication',
      icon: Shield,
      gradient: 'from-purple-600 to-purple-500',
      path: '/security',
      available: false
    },
    {
      title: 'Appearance',
      description: 'Customize the look and feel of your workspace',
      icon: Palette,
      gradient: 'from-pink-600 to-pink-500',
      path: '/appearance',
      available: false
    },
    {
      title: 'Data & Privacy',
      description: 'Export data, manage privacy settings',
      icon: Database,
      gradient: 'from-indigo-600 to-indigo-500',
      path: '/privacy',
      available: false
    }
  ]

  const handleCategoryClick = (category: typeof settingsCategories[0]) => {
    if (category.available) {
      navigate(category.path)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      <ResponsiveContainer maxWidth="xl" padding="md" className="py-6">
        <ResponsiveStack spacing="lg" className="animate-fade-in">
          {/* Modern Header */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="heading-2 text-gray-900">Settings</h1>
              <p className="text-body text-gray-600">
                Manage your account and application preferences
              </p>
            </div>
          </div>

          {/* Settings Categories Grid */}
          <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="lg">
            {settingsCategories.map((category, index) => (
              <Card
                key={category.title}
                padding="lg"
                hover={category.available}
                className={`
                  transition-all duration-300 animate-slide-up bg-gradient-to-br from-white to-gray-50/50
                  ${category.available 
                    ? 'cursor-pointer hover:shadow-glow hover:-translate-y-1' 
                    : 'opacity-60 cursor-not-allowed'
                  }
                `}
                style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                onClick={() => handleCategoryClick(category)}
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${category.gradient} shadow-medium`}>
                      <category.icon className="w-6 h-6 text-white" />
                    </div>
                    {category.available ? (
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    ) : (
                      <div className="px-2 py-1 bg-gray-100 rounded-full">
                        <span className="text-xs font-medium text-gray-500">Coming Soon</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </ResponsiveGrid>

          {/* Quick Actions */}
          <Card padding="lg" className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Quick Setup
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Complete your company profile to unlock all features and start generating professional invoices.
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/company')}
                  className="group"
                >
                  Complete Setup
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Help Section */}
          <Card padding="lg" className="bg-gradient-to-r from-white to-gray-50/50">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Need Help?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Check out our documentation or contact support for assistance with your account.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="secondary" size="sm">
                  View Documentation
                </Button>
                <Button variant="secondary" size="sm">
                  Contact Support
                </Button>
              </div>
            </div>
          </Card>
        </ResponsiveStack>
      </ResponsiveContainer>
    </div>
  )
}