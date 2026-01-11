/**
 * Error Messages Utility Tests
 * Tests for user-friendly error message mapping
 */

import { describe, it, expect } from 'vitest'
import { getUserFriendlyErrorMessage, sanitizeErrorMessage } from './errorMessages'

describe('getUserFriendlyErrorMessage', () => {
  it('should return user-friendly message for 401 login error', () => {
    const result = getUserFriendlyErrorMessage(null, {
      status: 401,
      operation: 'login',
    })
    
    expect(result.title).toBe('Login Failed')
    expect(result.message).toBe('Incorrect email or password')
  })

  it('should return user-friendly message for network error', () => {
    const result = getUserFriendlyErrorMessage(null, {
      status: 0,
      isOnline: true,
    })
    
    expect(result.title).toBe('Connection Problem')
    expect(result.message).toContain('Unable to reach the server')
  })

  it('should return user-friendly message for offline state', () => {
    const result = getUserFriendlyErrorMessage(null, {
      status: 500,
      isOnline: false,
    })
    
    expect(result.title).toBe('No Internet Connection')
    expect(result.message).toContain('check your connection')
  })

  it('should return user-friendly message for 500 server error', () => {
    const result = getUserFriendlyErrorMessage(null, {
      status: 500,
    })
    
    expect(result.title).toBe('Server Error')
    expect(result.message).toContain('went wrong on our end')
  })

  it('should return user-friendly message for 403 forbidden', () => {
    const result = getUserFriendlyErrorMessage(null, {
      status: 403,
    })
    
    expect(result.title).toBe('Access Denied')
    expect(result.message).toContain('permission')
  })

  it('should return user-friendly message for 404 not found', () => {
    const result = getUserFriendlyErrorMessage(null, {
      status: 404,
    })
    
    expect(result.title).toBe('Not Found')
    expect(result.message).toContain('could not be found')
  })

  it('should handle email conflict error', () => {
    const error = {
      message: 'Email already exists in the system',
    }
    
    const result = getUserFriendlyErrorMessage(error, {
      status: 409,
      operation: 'register',
    })
    
    expect(result.title).toBe('Email Already Registered')
    expect(result.message).toContain('already in use')
  })
})

describe('sanitizeErrorMessage', () => {
  it('should return message as-is if it contains no technical details', () => {
    const message = 'Please check your email and password'
    expect(sanitizeErrorMessage(message)).toBe(message)
  })

  it('should sanitize message containing JWT', () => {
    const message = 'JWT token is invalid or expired'
    const result = sanitizeErrorMessage(message)
    expect(result).toBe('An error occurred. Please try again')
  })

  it('should sanitize message containing database terms', () => {
    const message = 'Prisma database query failed on table users'
    const result = sanitizeErrorMessage(message)
    expect(result).toBe('An error occurred. Please try again')
  })

  it('should sanitize message containing SQL terms', () => {
    const message = 'SQL constraint violation on foreign key'
    const result = sanitizeErrorMessage(message)
    expect(result).toBe('An error occurred. Please try again')
  })

  it('should sanitize message containing stack trace patterns', () => {
    const message = 'Error at Object.method (file.js:123)'
    const result = sanitizeErrorMessage(message)
    expect(result).toBe('An error occurred. Please try again')
  })

  it('should sanitize message containing internal server error', () => {
    const message = 'Internal Server Error 500'
    const result = sanitizeErrorMessage(message)
    expect(result).toBe('An error occurred. Please try again')
  })
})
