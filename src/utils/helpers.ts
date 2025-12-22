/**
 * General helper utilities
 */

/**
 * Generate a unique ID using timestamp and random number
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 8)
  return prefix ? `${prefix}_${timestamp}_${randomPart}` : `${timestamp}_${randomPart}`
}

/**
 * Generate a unique invoice number
 * @param prefix - Prefix for the invoice number (default: 'INV')
 * @param existingNumbers - Array of existing invoice numbers to avoid duplicates
 * @returns Unique invoice number
 */
export function generateInvoiceNumber(
  prefix: string = 'INV',
  existingNumbers: string[] = []
): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  
  let counter = 1
  let invoiceNumber: string
  
  do {
    const counterStr = String(counter).padStart(4, '0')
    invoiceNumber = `${prefix}-${year}${month}-${counterStr}`
    counter++
  } while (existingNumbers.includes(invoiceNumber))
  
  return invoiceNumber
}

/**
 * Deep clone an object
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T
  }
  
  const cloned = {} as T
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  
  return cloned
}

/**
 * Debounce a function call
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Throttle a function call
 * @param func - Function to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      func(...args)
    }
  }
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param value - Value to check
 * @returns True if value is empty, false otherwise
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Round a number to specified decimal places
 * @param value - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
export function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Calculate percentage of a value
 * @param value - The value
 * @param total - The total
 * @returns Percentage as a decimal (0-1)
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return value / total
}

/**
 * Sort array of objects by a property
 * @param array - Array to sort
 * @param property - Property to sort by
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sorted array
 */
export function sortBy<T>(
  array: T[],
  property: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[property]
    const bVal = b[property]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Group array of objects by a property
 * @param array - Array to group
 * @param property - Property to group by
 * @returns Object with grouped items
 */
export function groupBy<T, K extends keyof T>(
  array: T[],
  property: K
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = String(item[property])
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<string, T[]>)
}