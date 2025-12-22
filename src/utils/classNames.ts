/**
 * Utility function for conditionally joining CSS class names
 * Useful for combining Tailwind CSS classes with conditional logic
 */

type ClassValue = string | number | boolean | undefined | null
type ClassArray = ClassValue[]
type ClassObject = Record<string, boolean | undefined | null>
type ClassInput = ClassValue | ClassArray | ClassObject

/**
 * Conditionally join CSS class names
 * @param inputs - Class names, arrays, or objects with boolean conditions
 * @returns Joined class name string
 * 
 * @example
 * ```typescript
 * // Basic usage
 * cn('btn', 'btn-primary') // 'btn btn-primary'
 * 
 * // With conditionals
 * cn('btn', isActive && 'btn-active') // 'btn btn-active' if isActive is true
 * 
 * // With objects
 * cn('btn', { 'btn-active': isActive, 'btn-disabled': isDisabled })
 * 
 * // With arrays
 * cn(['btn', 'btn-primary'], 'extra-class')
 * 
 * // Complex example
 * cn(
 *   'base-class',
 *   variant === 'primary' && 'primary-variant',
 *   variant === 'secondary' && 'secondary-variant',
 *   { 'disabled': isDisabled, 'loading': isLoading },
 *   extraClasses
 * )
 * ```
 */
export function cn(...inputs: ClassInput[]): string {
  const classes: string[] = []
  
  for (const input of inputs) {
    if (!input) continue
    
    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input))
    } else if (Array.isArray(input)) {
      const nested = cn(...input)
      if (nested) classes.push(nested)
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key)
      }
    }
  }
  
  return classes.join(' ')
}

/**
 * Alternative shorter alias for the cn function
 */
export const clsx = cn

/**
 * Utility for creating variant-based class names
 * @param base - Base classes that are always applied
 * @param variants - Object mapping variant names to their classes
 * @param defaultVariant - Default variant to use if none specified
 * @returns Function that takes variant and additional classes
 * 
 * @example
 * ```typescript
 * const buttonVariants = createVariants(
 *   'px-4 py-2 rounded font-medium transition-colors',
 *   {
 *     primary: 'bg-blue-600 text-white hover:bg-blue-700',
 *     secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
 *     outline: 'border border-gray-300 bg-transparent hover:bg-gray-50'
 *   },
 *   'primary'
 * )
 * 
 * // Usage
 * buttonVariants('secondary', 'extra-class') // Returns combined classes
 * buttonVariants() // Uses default variant
 * ```
 */
export function createVariants<T extends Record<string, string>>(
  base: string,
  variants: T,
  defaultVariant: keyof T
) {
  return (variant?: keyof T, ...additionalClasses: ClassInput[]) => {
    const selectedVariant = variant || defaultVariant
    return cn(base, variants[selectedVariant], ...additionalClasses)
  }
}

/**
 * Utility for creating size-based class names
 * @param sizes - Object mapping size names to their classes
 * @param defaultSize - Default size to use if none specified
 * @returns Function that takes size and additional classes
 */
export function createSizes<T extends Record<string, string>>(
  sizes: T,
  defaultSize: keyof T
) {
  return (size?: keyof T, ...additionalClasses: ClassInput[]) => {
    const selectedSize = size || defaultSize
    return cn(sizes[selectedSize], ...additionalClasses)
  }
}