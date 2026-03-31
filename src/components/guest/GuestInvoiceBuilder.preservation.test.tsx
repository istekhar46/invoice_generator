/**
 * Preservation Property Tests for GuestInvoiceBuilder
 * 
 * These tests validate that the bug fix does NOT break existing functionality.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 * 
 * Property 2: Preservation - Draft Restoration and Loading State
 * 
 * CRITICAL: These tests MUST PASS on unfixed code - they verify baseline behavior.
 * When these tests pass, it confirms that existing functionality works correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as fc from 'fast-check'
import type { GuestInvoiceData } from '../../types/guest'

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

describe('GuestInvoiceBuilder - Preservation Property Tests', () => {
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
   * Property 2.1: Preservation - Loader Display During Actual Loading
   * 
   * **Validates: Requirement 3.2**
   * 
   * This test verifies that when isLoadingData is true (actively loading),
   * the component displays the loader. This preserves the loading state behavior.
   * 
   * NOTE: After the fix, the loader should only show when isLoadingData is true.
   * 
   * EXPECTED OUTCOME: Test PASSES on fixed code
   * - The loader is displayed when isLoadingData === true
   * - This preserves the loading state behavior
   */
  it('Property 2.1: should display loader when data is null (current behavior on unfixed code)', () => {
    // Mock useGuestInvoice to return loading state
    useGuestInvoice.mockReturnValue({
      data: null,
      isLoading: true, // Loading is in progress
      updateData: vi.fn(),
      clearData: vi.fn(),
      isValid: false,
      errors: {},
      lastSaved: null,
    })

    // Mock useWizardStep
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
    const { container } = render(<GuestInvoiceBuilder />)

    // ASSERTION: Loader should be displayed when isLoadingData is true
    const spinningElements = container.querySelectorAll('.animate-spin')
    
    // Loader should be shown during actual loading
    expect(spinningElements.length).toBeGreaterThan(0)
  })

  /**
   * Property 2.2: Preservation - Draft Restoration
   * 
   * **Validates: Requirement 3.1**
   * 
   * This test verifies that when a saved draft exists (data !== null),
   * the component displays the appropriate wizard step based on currentStep.
   * 
   * EXPECTED OUTCOME: Test PASSES on unfixed code
   * - The correct wizard step is rendered when draft data exists
   * - This behavior must be preserved after the fix
   */
  it('Property 2.2: should render appropriate step when draft data exists', () => {
    fc.assert(
      fc.property(
        // Generate test cases with existing draft data
        fc.record({
          currentStep: fc.constantFrom('company', 'customer', 'details', 'items', 'review'),
          hasCompanyData: fc.boolean(),
        }),
        (draftState) => {
          // Create mock draft data
          const mockData: GuestInvoiceData = {
            company: draftState.hasCompanyData ? {
              businessName: 'Test Company',
              email: 'test@company.com',
              phone: '123-456-7890',
              address: '123 Test St',
              city: 'Test City',
              state: 'TS',
              zipCode: '12345',
              taxNumber: '123456789',
            } : null,
            customer: { name: 'Test Customer', email: 'customer@test.com' },
            invoiceDetails: {
              serviceDate: new Date(),
              dueDate: new Date(),
              taxRate: 0.08,
            },
            lineItems: [
              { 
                id: '1',
                type: 'material',
                description: 'Test Item', 
                unit: 'pcs',
                quantity: 1, 
                rate: 100,
                amount: 100
              }
            ],
            notes: 'Test notes',
            createdAt: new Date(),
            lastModified: new Date(),
          }

          // Mock useGuestInvoice to return draft data
          useGuestInvoice.mockReturnValue({
            data: mockData,
            isLoading: false,
            updateData: vi.fn(),
            clearData: vi.fn(),
            isValid: true,
            errors: {},
            lastSaved: new Date(),
          })

          // Mock useWizardStep with the current step
          const stepIndex = ['company', 'customer', 'details', 'items', 'review'].indexOf(draftState.currentStep)
          useWizardStep.mockReturnValue({
            currentStep: draftState.currentStep,
            goToNextStep: vi.fn(),
            goToPreviousStep: vi.fn(),
            goToStep: vi.fn(),
            canGoNext: true,
            canGoPrevious: stepIndex > 0,
            isFirstStep: stepIndex === 0,
            isLastStep: stepIndex === 4,
            stepIndex,
            totalSteps: 5,
          })

          // Render the component
          const { container } = render(<GuestInvoiceBuilder />)

          // ASSERTION: Appropriate step content should be rendered
          // Verify that loader is NOT shown when data exists
          const spinningElements = container.querySelectorAll('.animate-spin')
          expect(spinningElements.length).toBe(0)

          // Verify step-specific content is rendered
          switch (draftState.currentStep) {
            case 'company':
              expect(screen.getAllByText('Company Details')[0]).toBeInTheDocument()
              break
            case 'customer':
              expect(screen.getAllByText('Customer Details')[0]).toBeInTheDocument()
              break
            case 'details':
              expect(screen.getAllByText('Invoice Details')[0]).toBeInTheDocument()
              break
            case 'items':
              expect(screen.getAllByText('Line Items')[0]).toBeInTheDocument()
              break
            case 'review':
              expect(screen.getAllByText('Review Invoice')[0]).toBeInTheDocument()
              break
          }
        }
      ),
      {
        numRuns: 25,
        verbose: true,
      }
    )
  })

  /**
   * Property 2.3: Preservation - Auto-Save Functionality
   * 
   * **Validates: Requirement 3.3**
   * 
   * This test verifies that updateData is called when wizard data changes,
   * triggering the auto-save mechanism.
   * 
   * EXPECTED OUTCOME: Test PASSES on unfixed code
   * - updateData is called when user interacts with wizard steps
   * - This behavior must be preserved after the fix
   */
  it('Property 2.3: should call updateData when wizard data changes (auto-save)', async () => {
    const user = userEvent.setup()
    const mockUpdateData = vi.fn()

    // Mock useGuestInvoice with existing data (not null, so step renders)
    useGuestInvoice.mockReturnValue({
      data: {
        company: null,
        customer: { name: '' },
        invoiceDetails: {
          serviceDate: new Date(),
          dueDate: new Date(),
          taxRate: 0.08,
        },
        lineItems: [],
        notes: '',
        createdAt: new Date(),
        lastModified: new Date(),
      },
      isLoading: false,
      updateData: mockUpdateData,
      clearData: vi.fn(),
      isValid: false,
      errors: {},
      lastSaved: null,
    })

    // Mock useWizardStep at company step
    const mockGoToNextStep = vi.fn()
    useWizardStep.mockReturnValue({
      currentStep: 'company',
      goToNextStep: mockGoToNextStep,
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
    render(<GuestInvoiceBuilder />)

    // Find and click the "Skip this step" button (which triggers updateData)
    const skipButton = screen.getByText('Skip this step')
    await user.click(skipButton)

    // ASSERTION: updateData should be called
    await waitFor(() => {
      expect(mockUpdateData).toHaveBeenCalledWith({ company: null })
    })

    // ASSERTION: goToNextStep should be called
    expect(mockGoToNextStep).toHaveBeenCalled()
  })

  /**
   * Property 2.4: Preservation - Clear Draft Functionality
   * 
   * **Validates: Requirement 3.4**
   * 
   * This test verifies that clicking "Clear Draft" calls clearData
   * and resets to the first step.
   * 
   * EXPECTED OUTCOME: Test PASSES on unfixed code
   * - clearData is called when user clicks "Clear Draft"
   * - goToStep is called to reset to 'company' step
   * - This behavior must be preserved after the fix
   */
  it('Property 2.4: should call clearData and reset to first step when Clear Draft is clicked', async () => {
    const user = userEvent.setup()
    const mockClearData = vi.fn()
    const mockGoToStep = vi.fn()

    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    // Mock useGuestInvoice with existing draft data
    useGuestInvoice.mockReturnValue({
      data: {
        company: { name: 'Test Company' },
        customer: { name: 'Test Customer' },
        invoiceDetails: {
          serviceDate: new Date(),
          dueDate: new Date(),
          taxRate: 0.08,
        },
        lineItems: [],
        notes: '',
        createdAt: new Date(),
        lastModified: new Date(),
      },
      isLoading: false,
      updateData: vi.fn(),
      clearData: mockClearData,
      isValid: true,
      errors: {},
      lastSaved: new Date(),
    })

    // Mock useWizardStep at customer step
    useWizardStep.mockReturnValue({
      currentStep: 'customer',
      goToNextStep: vi.fn(),
      goToPreviousStep: vi.fn(),
      goToStep: mockGoToStep,
      canGoNext: true,
      canGoPrevious: true,
      isFirstStep: false,
      isLastStep: false,
      stepIndex: 1,
      totalSteps: 5,
    })

    // Render the component
    render(<GuestInvoiceBuilder />)

    // Find and click the "Clear Draft" button
    const clearDraftButton = screen.getByText('Clear Draft')
    await user.click(clearDraftButton)

    // ASSERTION: clearData should be called
    await waitFor(() => {
      expect(mockClearData).toHaveBeenCalled()
    })

    // ASSERTION: goToStep should be called with 'company'
    expect(mockGoToStep).toHaveBeenCalledWith('company')
  })

  /**
   * Property 2.5: Preservation - Draft Restoration Notification
   * 
   * **Validates: Requirement 3.1**
   * 
   * This test verifies that when a draft is restored (data exists after loading),
   * the "Draft Restored" notification is displayed.
   * 
   * EXPECTED OUTCOME: Test PASSES on unfixed code
   * - Notification is shown when draft data exists after loading completes
   * - This behavior must be preserved after the fix
   */
  it('Property 2.5: should display draft restoration notification when draft exists', () => {
    fc.assert(
      fc.property(
        // Generate test cases with draft data
        fc.constant({
          data: {
            company: { 
              businessName: 'Test Company',
              email: 'test@company.com',
              phone: '123-456-7890',
              address: '123 Test St',
              city: 'Test City',
              state: 'TS',
              zipCode: '12345',
              taxNumber: '123456789',
            },
            customer: { name: 'Test Customer' },
            invoiceDetails: {
              serviceDate: new Date(),
              dueDate: new Date(),
              taxRate: 0.08,
            },
            lineItems: [],
            notes: '',
            createdAt: new Date(),
            lastModified: new Date(),
          } as GuestInvoiceData,
          isLoadingData: false,
        }),
        (state) => {
          // Mock useGuestInvoice with draft data
          useGuestInvoice.mockReturnValue({
            data: state.data,
            isLoading: state.isLoadingData,
            updateData: vi.fn(),
            clearData: vi.fn(),
            isValid: true,
            errors: {},
            lastSaved: new Date(),
          })

          // Mock useWizardStep
          useWizardStep.mockReturnValue({
            currentStep: 'company',
            goToNextStep: vi.fn(),
            goToPreviousStep: vi.fn(),
            goToStep: vi.fn(),
            canGoNext: true,
            canGoPrevious: false,
            isFirstStep: true,
            isLastStep: false,
            stepIndex: 0,
            totalSteps: 5,
          })

          // Render the component
          render(<GuestInvoiceBuilder />)

          // ASSERTION: Draft restoration notification should be displayed
          expect(screen.getAllByText('Draft Restored')[0]).toBeInTheDocument()
          expect(screen.getAllByText('Your previous work has been restored.')[0]).toBeInTheDocument()
        }
      ),
      {
        numRuns: 10,
        verbose: true,
      }
    )
  })
})
