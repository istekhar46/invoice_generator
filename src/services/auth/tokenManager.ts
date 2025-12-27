// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

// Token management service
export class TokenManager {
  // Get access token from storage
  static getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY)
    } catch (error) {
      console.warn('Failed to get access token from localStorage:', error)
      return null
    }
  }

  // Get refresh token from storage
  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY)
    } catch (error) {
      console.warn('Failed to get refresh token from localStorage:', error)
      return null
    }
  }

  // Set both tokens
  static setTokens(accessToken: string, refreshToken: string): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } catch (error) {
      console.error('Failed to store tokens in localStorage:', error)
      // In case of storage failure, we should still continue but warn the user
      // This could happen in private browsing mode or when storage is full
    }
  }

  // Clear all tokens
  static clearTokens(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    } catch (error) {
      console.warn('Failed to clear tokens from localStorage:', error)
    }
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = this.getAccessToken()
    return !!token && !this.isTokenExpired(token)
  }

  // Check if token is expired (basic check - in production you'd decode JWT)
  static isTokenExpired(token: string): boolean {
    if (!token) return true
    
    try {
      // Basic JWT structure check
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp < currentTime
    } catch (error) {
      console.warn('Failed to decode token:', error)
      return true
    }
  }
}