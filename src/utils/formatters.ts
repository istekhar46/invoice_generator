/**
 * Formatting utilities for currency, dates, phone numbers, etc.
 */

/**
 * Format a number as currency (USD)
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a date as a readable string
 * @param date - The date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  return new Intl.DateTimeFormat('en-US', options).format(date)
}

/**
 * Format a date for input fields (YYYY-MM-DD)
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format a phone number to a standard display format
 * @param phone - The phone number to format
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Handle different lengths
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  
  // Return original if format is not recognized
  return phone
}

/**
 * Format a zip code to standard format
 * @param zipCode - The zip code to format
 * @returns Formatted zip code string
 */
export function formatZipCode(zipCode: string): string {
  // Remove all non-digit characters
  const digits = zipCode.replace(/\D/g, '')
  
  // Format as XXXXX or XXXXX-XXXX
  if (digits.length === 5) {
    return digits
  } else if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  
  // Return original if format is not recognized
  return zipCode
}

/**
 * Format a number with proper decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}

/**
 * Format a percentage value
 * @param value - The decimal value (e.g., 0.08 for 8%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Truncate text to a specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Capitalize the first letter of a string
 * @param text - The text to capitalize
 * @returns Capitalized text
 */
export function capitalize(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Format an address into a single line
 * @param address - Street address
 * @param city - City name
 * @param state - State abbreviation
 * @param zipCode - Zip code
 * @returns Formatted address string
 */
export function formatAddress(
  address: string,
  city: string,
  state: string,
  zipCode: string
): string {
  return `${address}, ${city}, ${state} ${zipCode}`
}