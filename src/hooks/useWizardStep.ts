/**
 * Custom hook for managing wizard step navigation
 * Handles step progression, validation, and navigation logic
 */

import { useState, useCallback } from 'react'
import type { WizardStep } from '../utils/guestInvoiceValidation'
import {
  validateStep,
  getNextStep,
  getPreviousStep,
} from '../utils/guestInvoiceValidation'
import type { GuestInvoiceData } from '../types/guest'

/**
 * Return type for useWizardStep hook
 */
export interface UseWizardStepReturn {
  currentStep: WizardStep
  goToNextStep: () => boolean
  goToPreviousStep: () => void
  goToStep: (step: WizardStep) => void
  canGoNext: boolean
  canGoPrevious: boolean
  isFirstStep: boolean
  isLastStep: boolean
  stepIndex: number
  totalSteps: number
}

/**
 * All wizard steps in order
 */
const WIZARD_STEPS: WizardStep[] = ['company', 'customer', 'details', 'items', 'review']

/**
 * Custom hook for managing wizard step navigation
 * 
 * @param data - Current guest invoice data for validation
 * @param initialStep - Initial step to start from (default: 'company')
 * @returns Wizard step state and navigation methods
 */
export function useWizardStep(
  data: Partial<GuestInvoiceData> | null,
  initialStep: WizardStep = 'company'
): UseWizardStepReturn {
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialStep)

  // Get current step index
  const stepIndex = WIZARD_STEPS.indexOf(currentStep)
  const totalSteps = WIZARD_STEPS.length

  // Check if current step is valid
  const isStepValid = useCallback((step: WizardStep): boolean => {
    if (!data) return false
    const validation = validateStep(step, data)
    return validation.isValid
  }, [data])

  // Navigate to next step
  const goToNextStep = useCallback((): boolean => {
    if (!isStepValid(currentStep)) {
      return false
    }

    const nextStep = getNextStep(currentStep)
    if (nextStep) {
      setCurrentStep(nextStep)
      return true
    }
    return false
  }, [currentStep, isStepValid])

  // Navigate to previous step
  const goToPreviousStep = useCallback((): void => {
    const previousStep = getPreviousStep(currentStep)
    if (previousStep) {
      setCurrentStep(previousStep)
    }
  }, [currentStep])

  // Navigate to specific step
  const goToStep = useCallback((step: WizardStep): void => {
    if (WIZARD_STEPS.includes(step)) {
      setCurrentStep(step)
    }
  }, [])

  // Check if can navigate
  const canGoNext = isStepValid(currentStep) && getNextStep(currentStep) !== null
  const canGoPrevious = getPreviousStep(currentStep) !== null
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === totalSteps - 1

  return {
    currentStep,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    canGoNext,
    canGoPrevious,
    isFirstStep,
    isLastStep,
    stepIndex,
    totalSteps,
  }
}
