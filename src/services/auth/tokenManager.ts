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
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  // Get refresh token from storage
  static getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  // Set both tokens
  static setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }

  // Clear all tokens
  static clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  // Check if token is expired (basic check - in production you'd decode JWT)
  static isTokenExpired(token: string): boolean {
    if (!token) return true
    
    try {
      // Basic JWT structure check
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp < currentTime
    } catch {
      return true
    }
  }
}