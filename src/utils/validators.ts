/**
 * Validation utilities for email, phone, zip codes, etc.
 */

import { VALIDATION_PATTERNS } from './constants'

/**
 * Validate email address format
 * @param email - The email address to validate
 * @returns True if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  return VALIDATION_PATTERNS.EMAIL.test(email.trim())
}

/**
 * Validate phone number format (US format)
 * @param phone - The phone number to validate
 * @returns True if phone number is valid, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }
  return VALIDATION_PATTERNS.PHONE.test(phone.trim())
}

/**
 * Validate zip code format (US format)
 * @param zipCode - The zip code to validate
 * @returns True if zip code is valid, false otherwise
 */
export function isValidZipCode(zipCode: string): boolean {
  if (!zipCode || typeof zipCode !== 'string') {
    return false
  }
  return VALIDATION_PATTERNS.ZIP_CODE.test(zipCode.trim())
}

/**
 * Validate that a string is not empty or just whitespace
 * @param value - The string to validate
 * @returns True if string has content, false otherwise
 */
export function isNotEmpty(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Validate that a number is positive
 * @param value - The number to validate
 * @returns True if number is positive, false otherwise
 */
export function isPositiveNumber(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value > 0
}

/**
 * Validate that a number is non-negative
 * @param value - The number to validate
 * @returns True if number is non-negative, false otherwise
 */
export function isNonNegativeNumber(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 0
}

/**
 * Validate that a value is within a specified range
 * @param value - The number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if value is within range, false otherwise
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max
}

/**
 * Validate US state abbreviation (2 characters)
 * @param state - The state abbreviation to validate
 * @returns True if state is valid 2-character abbreviation, false otherwise
 */
export function isValidStateAbbreviation(state: string): boolean {
  if (!state || typeof state !== 'string') {
    return false
  }
  
  const stateAbbr = state.trim().toUpperCase()
  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC' // District of Columbia
  ]
  
  return validStates.includes(stateAbbr)
}

/**
 * Validate that a date is not in the past
 * @param date - The date to validate
 * @returns True if date is today or in the future, false otherwise
 */
export function isNotPastDate(date: Date): boolean {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return false
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  
  return date >= today
}

/**
 * Validate that a due date is after a service date
 * @param serviceDate - The service date
 * @param dueDate - The due date
 * @returns True if due date is after service date, false otherwise
 */
export function isDueDateValid(serviceDate: Date, dueDate: Date): boolean {
  if (!(serviceDate instanceof Date) || !(dueDate instanceof Date)) {
    return false
  }
  
  if (isNaN(serviceDate.getTime()) || isNaN(dueDate.getTime())) {
    return false
  }
  
  return dueDate >= serviceDate
}

/**
 * Validate tax rate (should be between 0 and 1)
 * @param taxRate - The tax rate to validate
 * @returns True if tax rate is valid, false otherwise
 */
export function isValidTaxRate(taxRate: number): boolean {
  return isInRange(taxRate, 0, 1)
}

/**
 * Validate currency amount (should be non-negative with max 2 decimal places)
 * @param amount - The amount to validate
 * @returns True if amount is valid, false otherwise
 */
export function isValidCurrencyAmount(amount: number): boolean {
  if (!isNonNegativeNumber(amount)) {
    return false
  }
  
  // Check if it has more than 2 decimal places
  const decimalPlaces = (amount.toString().split('.')[1] || '').length
  return decimalPlaces <= 2
}