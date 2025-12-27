/**
 * Navigation service for handling programmatic navigation throughout the app
 * This service provides a centralized way to handle navigation that can be used
 * outside of React components where useNavigate hook is not available
 */

type NavigateFunction = (to: string, options?: { replace?: boolean }) => void

class NavigationService {
  private navigate: NavigateFunction | null = null

  /**
   * Initialize the navigation service with React Router's navigate function
   * This should be called once in the app initialization
   */
  setNavigate(navigateFunction: NavigateFunction) {
    this.navigate = navigateFunction
  }

  /**
   * Navigate to a specific route
   * Falls back to window.location if navigate function is not available
   */
  navigateTo(to: string, options: { replace?: boolean } = {}) {
    if (this.navigate) {
      this.navigate(to, options)
    } else {
      // Fallback to window.location for cases where navigate is not available
      console.warn('Navigate function not available, falling back to window.location')
      if (options.replace) {
        window.location.replace(to)
      } else {
        window.location.href = to
      }
    }
  }

  /**
   * Navigate to login page
   */
  navigateToLogin() {
    this.navigateTo('/login', { replace: true })
  }

  /**
   * Navigate to dashboard
   */
  navigateToDashboard() {
    this.navigateTo('/dashboard', { replace: true })
  }

  /**
   * Check if navigation service is properly initialized
   */
  isInitialized(): boolean {
    return this.navigate !== null
  }
}

// Export singleton instance
export const navigationService = new NavigationService()