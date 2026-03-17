/**
 * Guest invoice validation utilities
 * Handles validation logic for guest invoice forms
 */

import type { GuestInvoiceData, ValidationResult, ValidationErrors } from '../types/guest'
import {
  guestInvoiceDataSchema,
  guestCompanyDetailsSchema,
  guestCustomerDetailsSchema,
  guestInvoiceDetailsSchema,
  guestLineItemSchema,
} from '../types/guestSchemas'
import { z } from 'zod'

/**
 * Wizard step names
 */
export type WizardStep = 'company' | 'customer' | 'details' | 'items' | 'review'

/**
 * Validates complete guest invoice data
 * 
 * @param data - Guest invoice data to validate
 * @returns Validation result with isValid flag and error messages
 */
export function validateInvoiceData(data: Partial<GuestInvoiceData>): ValidationResult {
  try {
    guestInvoiceDataSchema.parse(data)
    return {
      isValid: true,
      errors: [],
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err) => {
        const path = err.path.join('.')
        return path ? `${path}: ${err.message}` : err.message
      })
      return {
        isValid: false,
        errors,
      }
    }
    return {
      isValid: false,
      errors: ['Validation failed'],
    }
  }
}

/**
 * Validates a specific wizard step
 * 
 * @param step - The wizard step to validate
 * @param data - Guest invoice data
 * @returns Validation result for the step
 */
export function validateStep(step: WizardStep, data: Partial<GuestInvoiceData>): ValidationResult {
  try {
    switch (step) {
      case 'company':
        // Company step is optional, always valid
        if (data.company) {
          guestCompanyDetailsSchema.parse(data.company)
        }
        return { isValid: true, errors: [] }

      case 'customer':
        if (!data.customer) {
          return { isValid: false, errors: ['Customer details are required'] }
        }
        guestCustomerDetailsSchema.parse(data.customer)
        return { isValid: true, errors: [] }

      case 'details':
        if (!data.invoiceDetails) {
          return { isValid: false, errors: ['Invoice details are required'] }
        }
        guestInvoiceDetailsSchema.parse(data.invoiceDetails)
        return { isValid: true, errors: [] }

      case 'items':
        if (!data.lineItems || data.lineItems.length === 0) {
          return { isValid: false, errors: ['At least one line item is required'] }
        }
        // Validate each line item
        for (const item of data.lineItems) {
          guestLineItemSchema.parse(item)
        }
        return { isValid: true, errors: [] }

      case 'review':
        // Review step validates all data
        return validateInvoiceData(data)

      default:
        return { isValid: false, errors: ['Invalid step'] }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err) => err.message)
      return {
        isValid: false,
        errors,
      }
    }
    return {
      isValid: false,
      errors: ['Validation failed'],
    }
  }
}

/**
 * Checks if user can proceed to the next step
 * 
 * @param currentStep - Current wizard step
 * @param data - Guest invoice data
 * @returns true if can proceed, false otherwise
 */
export function canProceedToNext(currentStep: WizardStep, data: Partial<GuestInvoiceData>): boolean {
  const validation = validateStep(currentStep, data)
  return validation.isValid
}

/**
 * Gets the next step in the wizard
 * 
 * @param currentStep - Current wizard step
 * @returns Next step name
 */
export function getNextStep(currentStep: WizardStep): WizardStep | null {
  const steps: WizardStep[] = ['company', 'customer', 'details', 'items', 'review']
  const currentIndex = steps.indexOf(currentStep)
  if (currentIndex === -1 || currentIndex === steps.length - 1) {
    return null
  }
  return steps[currentIndex + 1]
}

/**
 * Gets the previous step in the wizard
 * 
 * @param currentStep - Current wizard step
 * @returns Previous step name
 */
export function getPreviousStep(currentStep: WizardStep): WizardStep | null {
  const steps: WizardStep[] = ['company', 'customer', 'details', 'items', 'review']
  const currentIndex = steps.indexOf(currentStep)
  if (currentIndex <= 0) {
    return null
  }
  return steps[currentIndex - 1]
}

/**
 * Validates email format
 * 
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates phone format (international)
 * 
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false
  const phoneRegex = /^\+?[\d\s().\-]{7,20}$/
  return phoneRegex.test(phone)
}

/**
 * Gets validation errors by field
 * 
 * @param data - Guest invoice data to validate
 * @returns Object with field names as keys and error arrays as values
 */
export function getValidationErrors(data: Partial<GuestInvoiceData>): ValidationErrors {
  try {
    guestInvoiceDataSchema.parse(data)
    return {}
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationErrors = {}
      for (const err of error.issues) {
        const field = err.path.join('.')
        if (!errors[field]) {
          errors[field] = []
        }
        errors[field].push(err.message)
      }
      return errors
    }
    return {}
  }
}

/**
 * Checks if a field has validation errors
 * 
 * @param field - Field name
 * @param errors - Validation errors object
 * @returns true if field has errors, false otherwise
 */
export function hasFieldError(field: string, errors: ValidationErrors): boolean {
  return !!errors[field] && errors[field].length > 0
}

/**
 * Gets error message for a field
 * 
 * @param field - Field name
 * @param errors - Validation errors object
 * @returns First error message for the field, or empty string if no errors
 */
export function getFieldError(field: string, errors: ValidationErrors): string {
  if (!errors[field] || errors[field].length === 0) {
    return ''
  }
  return errors[field][0]
}
