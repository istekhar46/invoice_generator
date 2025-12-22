import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorDisplay, LoadingState } from '../components/shared'
import { useAuthStore } from '../store/authStore'
import { useAsyncOperation } from '../hooks'
import { loginSchema, type LoginFormData } from '../types/forms'

/**
 * LoginPage component for user authentication.
 * Enhanced with comprehensive error handling and loading states.
 * 
 * Requirements: 1.2, 8.5, 8.6 - User authentication, loading states, and error handling
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, clearError } = useAuthStore()

  const { loading, error, execute, clearError: clearAsyncError } = useAsyncOperation({
    errorType: 'authentication',
    onSuccess: () => {
      // Redirect to the originally requested page or dashboard
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    clearError()
    clearAsyncError()
    
    await execute(async () => {
      await login(data)
    })
  }

  const handleRetry = () => {
    clearError()
    clearAsyncError()
  }

  return (
    <div className="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <Link
              to="/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        <Card className="p-6">
          <LoadingState loading={loading} type="authenticating" overlay={true}>
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <ErrorDisplay
                  error={error}
                  type="authentication"
                  showRetry={true}
                  onRetry={handleRetry}
                  onDismiss={clearAsyncError}
                />
              )}

              <div>
                <Input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  label="Email address"
                  placeholder="Enter your email"
                  error={errors.email?.message}
                />
              </div>

              <div>
                <Input
                  {...register('password')}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  label="Password"
                  placeholder="Enter your password"
                  error={errors.password?.message}
                />
              </div>

              <div>
                <Button 
                  type="submit" 
                  className="w-full"
                  loading={loading}
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>
            </form>
          </LoadingState>

          {/* Demo credentials helper */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 font-medium mb-2">Demo Credentials:</p>
            <p className="text-xs text-blue-700">
              Create an account first, or use any email/password combination to test the system.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}