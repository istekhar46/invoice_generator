# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Display First Step When No Draft Exists
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case - opening popup with no saved draft in localStorage
  - Test that when `isLoadingData === false` and `data === null` (no saved draft), the component renders CompanyDetailsStep instead of the loader
  - Mock `useGuestInvoice` to return `{ data: null, isLoadingData: false, updateData: jest.fn(), clearData: jest.fn() }`
  - Mock `useWizardStep` to return `{ currentStep: 'company', goToStep: jest.fn(), nextStep: jest.fn(), previousStep: jest.fn(), resetStep: jest.fn() }`
  - Assert that `CompanyDetailsStep` is rendered (not `Loader2`)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: "Loader2 is rendered when data is null and isLoadingData is false, instead of CompanyDetailsStep"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Draft Restoration and Loading State
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (when draft exists OR when actively loading)
  - Write property-based tests capturing observed behavior patterns:
    - When `isLoadingData === true`, loader should be displayed (actual loading state)
    - When `data !== null`, appropriate wizard step should be rendered based on `currentStep`
    - Draft restoration: when saved draft exists, correct step is displayed
    - Auto-save: `updateData` is called when wizard data changes
    - Clear draft: `clearData` resets to first step
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix infinite loader when no draft exists

  - [x] 3.1 Implement the fix in GuestInvoiceBuilder.tsx
    - Change the loading condition in `renderStep()` function (line 127)
    - Replace `if (!data)` with `if (isLoadingData)`
    - This correctly checks whether data is actively being loaded
    - When loading completes with no data, the function will fall through to the switch statement
    - The switch statement will handle `currentStep === 'company'` and render the first step
    - _Bug_Condition: isBugCondition(state) where state.data === null AND state.isLoadingData === false AND noSavedDraftInLocalStorage()_
    - _Expected_Behavior: renderStep() SHALL display CompanyDetailsStep when isLoadingData === false and data === null_
    - _Preservation: Draft restoration, loader during actual loading, auto-save, clear draft, and wizard navigation must remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Display First Step When No Draft Exists
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Draft Restoration and Loading State
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
