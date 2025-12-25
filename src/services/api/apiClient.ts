import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ENV } from '../../utils/env'
import { TokenManager } from '../auth/tokenManager'

// Request configuration interface
export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean
}

// Extended internal config for interceptors
interface ExtendedInternalConfig extends InternalAxiosRequestConfig {
  skipAuth?: boolean
  _retry?: boolean
}

// API Client interface
export interface ApiClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<T>
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<T>
  patch<T>(url: string, data?: any, config?: RequestConfig): Promise<T>
  delete<T>(url: string, config?: RequestConfig): Promise<T>
}

// API Error class for structured error handling
export class ApiError extends Error {
  public message: string
  public status: number
  public statusText: string
  public data?: any

  constructor(
    message: string,
    status: number,
    statusText: string,
    data?: any
  ) {
    super(message)
    this.name = 'ApiError'
    this.message = message
    this.status = status
    this.statusText = statusText
    this.data = data
  }
}

// Base HTTP Client implementation
class BaseApiClient implements ApiClient {
  private axiosInstance: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value: any) => void
    reject: (error: any) => void
  }> = []

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor for authentication and logging
    this.axiosInstance.interceptors.request.use(
      (config: ExtendedInternalConfig) => {
        // Add authentication token if not skipped
        if (!config.skipAuth) {
          const token = TokenManager.getAccessToken()
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        }

        if (ENV.DEV) {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
        }
        return config
      },
      (error) => {
        if (ENV.DEV) {
          console.error('[API] Request error:', error)
        }
        return Promise.reject(error)
      }
    )

    // Response interceptor for token refresh and error handling
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        if (ENV.DEV) {
          console.log(`[API] Response ${response.status}:`, response.data)
        }
        return response
      },
      async (error) => {
        const originalRequest = error.config as ExtendedInternalConfig

        if (ENV.DEV) {
          console.error('[API] Response error:', error)
        }

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject })
            }).then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              return this.axiosInstance(originalRequest)
            }).catch((err) => {
              return Promise.reject(err)
            })
          }

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            const refreshToken = TokenManager.getRefreshToken()
            if (!refreshToken) {
              throw new Error('No refresh token available')
            }

            // Attempt to refresh the token
            const response = await this.axiosInstance.post('/auth/refresh', {
              refreshToken,
            }, { skipAuth: true } as RequestConfig)

            const { accessToken, refreshToken: newRefreshToken } = response.data
            TokenManager.setTokens(accessToken, newRefreshToken)

            // Process failed queue
            this.processQueue(null, accessToken)

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            return this.axiosInstance(originalRequest)
          } catch (refreshError) {
            // Token refresh failed - logout user
            this.processQueue(refreshError, null)
            this.handleAuthFailure()
            return Promise.reject(refreshError)
          } finally {
            this.isRefreshing = false
          }
        }
        
        // Transform axios error to ApiError
        if (error.response) {
          throw new ApiError(
            error.response.data?.message || error.message,
            error.response.status,
            error.response.statusText,
            error.response.data
          )
        } else if (error.request) {
          throw new ApiError(
            'Network error - please check your connection',
            0,
            'Network Error'
          )
        } else {
          throw new ApiError(
            error.message || 'An unexpected error occurred',
            0,
            'Unknown Error'
          )
        }
      }
    )
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error)
      } else {
        resolve(token)
      }
    })
    
    this.failedQueue = []
  }

  private handleAuthFailure() {
    // Clear tokens
    TokenManager.clearTokens()
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<any>(url, config)
    return response.data?.data ?? response.data
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<any>(url, data, config)
    return response.data?.data ?? response.data
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<any>(url, data, config)
    return response.data?.data ?? response.data
  }

  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<any>(url, data, config)
    return response.data?.data ?? response.data
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<any>(url, config)
    return response.data?.data ?? response.data
  }

  // Create cancellation token for request cancellation
  createCancelToken() {
    return axios.CancelToken.source()
  }

  // Check if error is a cancellation error
  isCancelError(error: any): boolean {
    return axios.isCancel(error)
  }

  // Classify API errors for better handling
  classifyError(error: ApiError): 'network' | 'auth' | 'validation' | 'server' | 'client' {
    if (error.status === 0) return 'network'
    if (error.status === 401 || error.status === 403) return 'auth'
    if (error.status === 400 || error.status === 422) return 'validation'
    if (error.status >= 500) return 'server'
    return 'client'
  }

  // Get user-friendly error message
  getErrorMessage(error: ApiError): string {
    const errorType = this.classifyError(error)
    
    switch (errorType) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection.'
      case 'auth':
        return 'You are not authorized to perform this action. Please log in again.'
      case 'validation':
        return error.data?.message || 'Please check your input and try again.'
      case 'server':
        return 'Server error occurred. Please try again later.'
      default:
        return error.message || 'An unexpected error occurred.'
    }
  }

  // Get the axios instance for advanced usage
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance
  }
}

// Export singleton instance
export const apiClient = new BaseApiClient()