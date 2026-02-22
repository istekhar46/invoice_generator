import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TokenManager } from '../services/auth/tokenManager'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

/**
 * GoogleAuthCallbackPage
 *
 * Landing page for the Google OAuth redirect flow.
 * The backend redirects here after successful authentication:
 *   /auth/callback?accessToken=<JWT>
 *
 * This page:
 *  1. Reads the access token from the URL query param
 *  2. Stores it in memory via TokenManager
 *  3. Navigates to /dashboard (or /login on failure)
 *
 * NOTE: The backend also sets the HttpOnly refreshToken cookie
 * as part of the same redirect response, so no cookie handling
 * is needed here.
 */
export const GoogleAuthCallbackPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('accessToken')

    if (accessToken) {
      TokenManager.setAccessToken(accessToken)
      navigate('/dashboard', { replace: true })
    } else {
      // No token means something went wrong — send to login with an error flag
      navigate('/login?error=google_auth_failed', { replace: true })
    }
  }, [navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <LoadingSpinner size="large" />
      <p className="text-gray-500 text-sm">Completing Google sign-in…</p>
    </div>
  )
}
