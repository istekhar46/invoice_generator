import { apiClient } from './apiClient'

// Authentication DTOs matching backend
export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  password: string
  displayName: string
}

// Response DTOs matching backend
export interface UserResponseDto {
  id: string
  email: string
  displayName: string
  photoURL?: string
  createdAt: Date
  updatedAt: Date
}

export interface AuthResponseDto {
  user: UserResponseDto
  accessToken: string
}

// Authentication API service
export class AuthApi {
  private refreshRequest: Promise<AuthResponseDto> | null = null
  /**
   * Login user with email and password
   */
  async login(credentials: LoginDto): Promise<AuthResponseDto> {
    return apiClient.post<AuthResponseDto>('/auth/login', credentials, {
      skipAuth: true, // Don't include auth token for login
    })
  }

  /**
   * Register new user
   */
  async register(userData: RegisterDto): Promise<AuthResponseDto> {
    return apiClient.post<AuthResponseDto>('/auth/register', userData, {
      skipAuth: true, // Don't include auth token for registration
    })
  }

  /**
   * Logout user (invalidate tokens on server)
   */
  async logout(): Promise<void> {
    return apiClient.post<void>('/auth/logout')
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserResponseDto> {
    return apiClient.get<UserResponseDto>('/auth/me')
  }

  /**
   * Refresh access token using refresh token from HttpOnly cookie
   */
  refreshToken(): Promise<AuthResponseDto> {
    // Header and route guards restore the same session concurrently on reload.
    if (!this.refreshRequest) {
      this.refreshRequest = apiClient
        .post<AuthResponseDto>('/auth/refresh', {}, { skipAuth: true })
        .finally(() => {
          this.refreshRequest = null
        })
    }
    return this.refreshRequest
  }

  /**
   * Google OAuth login callback
   */
  async googleLogin(code: string): Promise<AuthResponseDto> {
    return apiClient.post<AuthResponseDto>(
      '/auth/google',
      { code },
      {
        skipAuth: true,
      }
    )
  }
}

// Export singleton instance
export const authApi = new AuthApi()
