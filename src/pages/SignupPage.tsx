import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, UserPlus } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { useAuthStore } from '../store/authStore'
import { signupSchema } from '../types/forms'

// Extended signup schema with password confirmation
const signupWithConfirmSchema = signupSchema.extend({
  confirmPassword: z.string().min(6, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupWithConfirmFormData = z.infer<typeof signupWithConfirmSchema>

/**
 * SignupPage component for user registration.
 * 
 * Requirements: 1.1 - WHEN a user provides valid email, password, and display name, THE System SHALL create a new user account
 */
export const SignupPage: React.FC = () => {
  const navigate = useNavigate()
  const { signup, loading, error, clearError } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupWithConfirmFormData>({
    resolver: zodResolver(signupWithConfirmSchema),
  })

  const onSubmit = async (data: SignupWithConfirmFormData) => {
    try {
      clearError()
      // Extract the data needed for signup (without confirmPassword)
      const { confirmPassword, ...signupData } = data
      await signup(signupData)
      
      // Redirect to dashboard after successful signup
      navigate('/dashboard', { replace: true })
    } catch (error) {
      // Error is handled by the store
      console.error('Signup failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Modern Logo and Branding */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-primary p-4 rounded-2xl shadow-glow animate-bounce-subtle">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="heading-2 text-gray-900 mb-2">
            Create your account
          </h1>
          <p className="text-body text-gray-600">
            Start managing your invoices professionally
          </p>
        </div>

        {/* Modern Card with Glass Morphism */}
        <Card 
          padding="lg" 
          hover={true}
          className="backdrop-blur-sm bg-white/90 border-white/20 shadow-medium"
        >
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <ErrorAlert
                title="Signup Failed"
                message={error}
                onDismiss={clearError}
              />
            )}

            <div className="space-y-5">
              <Input
                {...register('displayName')}
                id="displayName"
                type="text"
                autoComplete="name"
                label="Display name"
                placeholder="Enter your full name"
                error={errors.displayName?.message}
                variant="filled"
              />

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
                autoComplete="new-password"
                label="Password"
                placeholder="Create a password"
                error={errors.password?.message}
                helpText="Password must be at least 6 characters"
                variant="filled"
              />

              <Input
                {...register('confirmPassword')}
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                label="Confirm password"
                placeholder="Confirm your password"
                error={errors.confirmPassword?.message}
                variant="filled"
              />
            </div>

            <Button 
              type="submit" 
              variant="primary"
              size="lg"
              fullWidth={true}
              loading={loading}
              disabled={loading}
              className="group"
            >
              {loading ? (
                'Creating account...'
              ) : (
                <>
                  Create account
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          {/* Benefits Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-3">
              By creating an account, you'll get:
            </p>
            <div className="space-y-2">
              {[
                'Professional invoice generation',
                'Customer management',
                'Real-time statistics',
              ].map((benefit, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Modern Sign In Link */}
        <div className="text-center">
          <p className="text-body-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-link font-semibold hover:text-primary-700 transition-colors duration-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}