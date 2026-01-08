import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorDisplay } from '../components/shared'
import { useLogin } from '../hooks/useAuth'
import { loginSchema, type LoginFormData } from '../types/forms'
import logo from '../assets/logo_3.png'

/**
 * LoginPage component for user authentication.
 * Enhanced with comprehensive error handling and loading states.
 * 
 * Requirements: 1.2, 8.5, 8.6 - User authentication, loading states, and error handling
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login.mutateAsync(data)
      // Redirect to the originally requested page or dashboard
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Login failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to from-primary-50 via-white to-secondary-50 flex items-center justify-center py-12 p-0 md:px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Modern Logo and Branding */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl animate-bounce-subtle">
              {/* <Zap className="w-8 h-8 text-white" /> */}
              <img src={logo} alt="logo" className='w-44'/>
            </div>
          </div>
          {/* <h1 className="heading-2 text-gray-900 mb-2">
            Welcome back
          </h1> */}
          <p className="text-body text-gray-600">
            Sign in to your Invoice Pro account
          </p>
        </div>

        {/* Modern Card with Glass Morphism */}
        <Card 
          padding="sm" 
          hover={true}
          className="backdrop-blur-sm bg-white/90 border-white/20 shadow-medium md:p-8"
        >
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {login.error && (
              <ErrorDisplay
                error={login.error instanceof Error ? login.error.message : 'Login failed'}
                type="authentication"
                showRetry={true}
              />
            )}

            <div className="space-y-5">
              <Input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                label="Email address"
                placeholder="Enter your email"
                error={errors.email?.message}
                variant="filled"
              />

              <Input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="current-password"
                label="Password"
                placeholder="Enter your password"
                error={errors.password?.message}
                variant="filled"
              />
            </div>

            <Button 
              type="submit" 
              variant="primary"
              size="lg"
              fullWidth={true}
              loading={login.isPending}
              disabled={login.isPending}
              className="group"
            >
              {login.isPending ? (
                'Signing in...'
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          {/* Demo credentials helper with modern styling */}

          {/* <div className="mt-6 p-4 bg-gradient-to from-primary-50 to-blue-50 border border-primary-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg">
                <img src={logo} alt="logo" className='w-10'/>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-800 mb-1">Demo Access</p>
                <p className="text-xs text-primary-700">
                  Create an account first, or use any email/password combination to test the system.
                </p>
              </div>
            </div>
          </div> */}
        </Card>

        {/* Modern Sign Up Link */}
        <div className="text-center">
          <p className="text-body-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-link font-semibold hover:text-primary-700 transition-colors duration-200"
            >
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}