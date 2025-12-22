/**
 * Error Handler Service
 * Centralized error handling and reporting service
 */

import type { ErrorType } from '../components/shared/ErrorDisplay'

export interface ErrorReport {
  error: Error
  type: ErrorType
  context?: Record<string, any>
  timestamp: Date
  userAgent: string
  url: string
}

export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean
  enableErrorReporting: boolean
  maxErrorReports: number
  reportingEndpoint?: string
}

/**
 * Global error handler service
 */
class ErrorHandlerService {
  private config: ErrorHandlerConfig
  private errorReports: ErrorReport[] = []

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableErrorReporting: import.meta.env.PROD,
      maxErrorReports: 100,
      ...config,
    }

    // Set up global error handlers
    this.setupGlobalHandlers()
  }

  /**
   * Set up global error handlers for unhandled errors
   */
  private setupGlobalHandlers() {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(
        new Error(event.message),
        'unknown',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      )
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        'unknown',
        { type: 'unhandledrejection' }
      )
    })
  }

  /**
   * Handle an error with optional context
   */
  handleError(error: Error, type: ErrorType = 'unknown', context?: Record<string, any>) {
    const errorReport: ErrorReport = {
      error,
      type,
      context,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    // Store error report
    this.storeErrorReport(errorReport)

    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      console.error('Error handled by ErrorHandlerService:', {
        message: error.message,
        stack: error.stack,
        type,
        context,
        timestamp: errorReport.timestamp,
      })
    }

    // Send to error reporting service if enabled
    if (this.config.enableErrorReporting) {
      this.reportError(errorReport)
    }
  }

  /**
   * Store error report locally
   */
  private storeErrorReport(errorReport: ErrorReport) {
    this.errorReports.push(errorReport)

    // Keep only the most recent error reports
    if (this.errorReports.length > this.config.maxErrorReports) {
      this.errorReports = this.errorReports.slice(-this.config.maxErrorReports)
    }

    // Store in localStorage for debugging
    try {
      const recentErrors = this.errorReports.slice(-10).map(report => ({
        message: report.error.message,
        type: report.type,
        timestamp: report.timestamp,
        url: report.url,
      }))
      localStorage.setItem('app_error_reports', JSON.stringify(recentErrors))
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Report error to external service
   */
  private async reportError(errorReport: ErrorReport) {
    if (!this.config.reportingEndpoint) {
      return
    }

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: errorReport.error.message,
          stack: errorReport.error.stack,
          type: errorReport.type,
          context: errorReport.context,
          timestamp: errorReport.timestamp.toISOString(),
          userAgent: errorReport.userAgent,
          url: errorReport.url,
        }),
      })
    } catch (e) {
      // Ignore reporting errors to avoid infinite loops
      console.warn('Failed to report error to external service:', e)
    }
  }

  /**
   * Get recent error reports
   */
  getErrorReports(): ErrorReport[] {
    return [...this.errorReports]
  }

  /**
   * Clear all error reports
   */
  clearErrorReports() {
    this.errorReports = []
    try {
      localStorage.removeItem('app_error_reports')
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorHandlerConfig>) {
    this.config = { ...this.config, ...config }
  }
}

// Create singleton instance
export const errorHandlerService = new ErrorHandlerService()

/**
 * Utility function to handle errors consistently
 */
export const handleError = (error: Error | string, type: ErrorType = 'unknown', context?: Record<string, any>) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  errorHandlerService.handleError(errorObj, type, context)
}

/**
 * Utility function to wrap async functions with error handling
 */
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  type: ErrorType = 'unknown',
  context?: Record<string, any>
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(error as Error, type, context)
      return null
    }
  }
}

/**
 * Utility function to wrap sync functions with error handling
 */
export const withSyncErrorHandling = <T extends any[], R>(
  fn: (...args: T) => R,
  type: ErrorType = 'unknown',
  context?: Record<string, any>
) => {
  return (...args: T): R | null => {
    try {
      return fn(...args)
    } catch (error) {
      handleError(error as Error, type, context)
      return null
    }
  }
}