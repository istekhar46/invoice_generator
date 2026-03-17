/**
 * Bug Condition Exploration Test for GuestInvoiceBuilder
 * 
 * This test validates the bug fix for the infinite loader issue when no draft exists.
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * Property 1: Fault Condition - Display First Step When No Draft Exists
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * When the test fails, it proves that the loader is rendered instead of the first step.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// Mock the hooks with factory functions
vi.mock('../../hooks/useGuestInvoice', () => ({
  useGuestInvoice: vi.fn(),
}))

vi.mock('../../hooks/useWizardStep', () => ({
  useWizardStep: vi.fn(),
}))

describe('GuestInvoiceBuilder - Bug Condition Exploration', () => {
  // Import the component after mocks are set up
  let GuestInvoiceBuilder: any
  let useGuestInvoice: any
  let useWizardStep: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Import mocked modules
    const guestInvoiceModule = await import('../../hooks/useGuestInvoice')
    const wizardStepModule = await import('../../hooks/useWizardStep')
    const componentModule = await import('./GuestInvoiceBuilder')
    
    useGuestInvoice = guestInvoiceModule.useGuestInvoice
    useWizardStep = wizardStepModule.useWizardStep
    GuestInvoiceBuilder = componentModule.GuestInvoiceBuilder
  })

  /**
   * Property 1: Fault Condition - Display First Step When No Draft Exists
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3**
   * 
   * This test verifies that when loading completes with no saved draft
   * (isLoadingData === false and data === null), the component should
   * render the first wizard step (CompanyDetailsStep) instead of the loader.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   * - The loader (Loader2) is rendered instead of CompanyDetailsStep
   * - This confirms the bug exists: infinite loader when no draft exists
   * 
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES
   * - CompanyDetailsStep is rendered when loading completes with no data
   * - This confirms the bug is fixed
   */
  it('Property 1: should render CompanyDetailsStep when isLoadingData is false and data is null (no saved draft)', () => {
    // Property-based test: Generate test cases for the bug condition
    fc.assert(
      fc.property(
        // We're testing the specific bug condition: no draft exists
        fc.constant({
          data: null,
          isLoadingData: false,
        }),
        (bugCondition) => {
          // Mock useGuestInvoice to return the bug condition state
          useGuestInvoice.mockReturnValue({
            data: bugCondition.data,
            isLoading: bugCondition.isLoadingData,
            updateData: vi.fn(),
            clearData: vi.fn(),
            isValid: false,
            errors: {},
            lastSaved: null,
          })

          // Mock useWizardStep to return the initial step
          useWizardStep.mockReturnValue({
            currentStep: 'company',
            goToNextStep: vi.fn(),
            goToPreviousStep: vi.fn(),
            goToStep: vi.fn(),
            canGoNext: false,
            canGoPrevious: false,
            isFirstStep: true,
            isLastStep: false,
            stepIndex: 0,
            totalSteps: 5,
          })

          // Render the component
          const { container, unmount } = render(<GuestInvoiceBuilder />)

          // ASSERTION: CompanyDetailsStep should be rendered
          // We check for the distinctive heading "Company Details"
          const companyDetailsHeading = screen.queryAllByText('Company Details')
          
          // CRITICAL: On unfixed code, this will be empty (loader is shown instead)
          // On fixed code, this will be found (first step is shown)
          expect(companyDetailsHeading.length).toBeGreaterThan(0)

          // ADDITIONAL ASSERTION: Loader should NOT be rendered
          // The loader has a specific class "animate-spin"
          const spinningElements = container.querySelectorAll('.animate-spin')
          
          // On unfixed code, we expect to find the spinning loader
          // On fixed code, we expect NO spinning loader
          expect(spinningElements.length).toBe(0)
          
          // Clean up after each test run
          unmount()
        }
      ),
      {
        numRuns: 10, // Run the property test 10 times to ensure consistency
        verbose: true,
      }
    )
  })

  /**
   * Additional unit test for the same bug condition
   * This provides a simpler, non-property-based verification
   */
  it('Unit Test: should display first step when no draft exists in localStorage', () => {
    // Mock the bug condition: loading complete, no data
    useGuestInvoice.mockReturnValue({
      data: null,
      isLoading: false,
      updateData: vi.fn(),
      clearData: vi.fn(),
      isValid: false,
      errors: {},
      lastSaved: null,
    })

    useWizardStep.mockReturnValue({
      currentStep: 'company',
      goToNextStep: vi.fn(),
      goToPreviousStep: vi.fn(),
      goToStep: vi.fn(),
      canGoNext: false,
      canGoPrevious: false,
      isFirstStep: true,
      isLastStep: false,
      stepIndex: 0,
      totalSteps: 5,
    })

    render(<GuestInvoiceBuilder />)

    // Verify CompanyDetailsStep is rendered
    expect(screen.getByText('Company Details')).toBeInTheDocument()
    expect(screen.getByText('Add your business information (optional)')).toBeInTheDocument()
    
    // Verify loader is NOT rendered
    const spinningElements = document.querySelectorAll('.animate-spin')
    expect(spinningElements.length).toBe(0)
  })
})
