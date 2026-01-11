// Token management service
// Uses memory-only storage for access tokens (no localStorage)
// Refresh tokens are managed via HttpOnly cookies by the backend
export class TokenManager {
  // In-memory storage for access token (not persisted)
  private static accessToken: string | null = null

  // Get access token from memory
  static getAccessToken(): string | null {
    return this.accessToken
  }

  // Set access token in memory
  static setAccessToken(token: string): void {
    this.accessToken = token
  }

  // Clear access token from memory
  static clearAccessToken(): void {
    this.accessToken = null
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = this.getAccessToken()
    return !!token && !this.isTokenExpired(token)
  }

  // Check if token is expired
  static isTokenExpired(token: string): boolean {
    if (!token) return true
    
    try {
      // Decode JWT payload to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp < currentTime
    } catch (error) {
      console.warn('Failed to decode token:', error)
      return true
    }
  }
}