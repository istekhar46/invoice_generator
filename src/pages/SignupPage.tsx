import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
    <div className="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <Card className="p-6">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <ErrorAlert
                title="Signup Failed"
                message={error}
                onDismiss={clearError}
              />
            )}

            <div>
              <Input
                {...register('displayName')}
                id="displayName"
                type="text"
                autoComplete="name"
                label="Display name"
                placeholder="Enter your full name"
                error={errors.displayName?.message}
              />
            </div>

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
                autoComplete="new-password"
                label="Password"
                placeholder="Create a password"
                error={errors.password?.message}
                helpText="Password must be at least 6 characters"
              />
            </div>

            <div>
              <Input
                {...register('confirmPassword')}
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                label="Confirm password"
                placeholder="Confirm your password"
                error={errors.confirmPassword?.message}
              />
            </div>

            <div>
              <Button 
                type="submit" 
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}