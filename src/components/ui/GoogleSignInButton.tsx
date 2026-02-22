import React from 'react'

/**
 * GoogleSignInButton
 *
 * Uses a plain <a> redirect to the backend's Passport Google OAuth endpoint.
 * This is the correct approach for the Authorization Code (server-side redirect)
 * flow — NOT the @react-oauth/google popup/ID-token flow.
 */
const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const GOOGLE_AUTH_URL = `${BACKEND_URL}/api/v1/auth/google`

interface GoogleSignInButtonProps {
  label?: string
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  label = 'Continue with Google',
}) => {
  return (
    <a href={GOOGLE_AUTH_URL} className="google-signin-btn" aria-label={label}>
      {/* Official Google "G" SVG logo */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
        />
      </svg>
      <span>{label}</span>
    </a>
  )
}
