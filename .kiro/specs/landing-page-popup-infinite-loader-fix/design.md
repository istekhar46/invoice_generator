# Landing Page Popup Infinite Loader Fix - Bugfix Design

## Overview

The bug occurs when new users click "Create Free Invoice Now" on the landing page. The popup displays an infinite loader instead of showing the first step of the invoice wizard. The root cause is in the `renderStep()` function of `GuestInvoiceBuilder.tsx`, which checks `if (!data)` to display a loader. However, `data` legitimately remains `null` after the `useGuestInvoice` hook completes loading when no draft exists in localStorage.

The fix involves distinguishing between "actively loading from localStorage" and "finished loading with no data". The component should check the `isLoadingData` flag instead of checking if `data` is null, or ensure that `data` is initialized to an empty structure when loading completes with no saved draft.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the popup opens with no saved draft in localStorage
- **Property (P)**: The desired behavior - the first wizard step (Company Details) should be displayed
- **Preservation**: Existing draft restoration, auto-save, and clear draft functionality that must remain unchanged
- **renderStep()**: The function in `GuestInvoiceBuilder.tsx` (line 127) that determines which wizard step to display
- **useGuestInvoice**: The custom hook in `src/hooks/useGuestInvoice.ts` that manages invoice data and localStorage persistence
- **isLoadingData**: The loading state flag returned by `useGuestInvoice` that indicates whether data is being loaded from localStorage
- **data**: The invoice data state that can be `null` (no data) or a `GuestInvoiceData` object

## Bug Details

### Fault Condition

The bug manifests when a user opens the invoice builder popup and no saved draft exists in localStorage. The `useGuestInvoice` hook completes loading (sets `isLoading` to `false`) but leaves `data` as `null`. The `renderStep()` function then checks `if (!data)` and renders the loader indefinitely, even though loading has completed.

**Formal Specification:**
```
FUNCTION isBugCondition(state)
  INPUT: state of type { data: GuestInvoiceData | null, isLoadingData: boolean }
  OUTPUT: boolean
  
  RETURN state.data === null
         AND state.isLoadingData === false
         AND noSavedDraftInLocalStorage()
END FUNCTION
```

### Examples

- **New User Flow**: User clicks "Create Free Invoice Now" → Popup opens → Hook loads from localStorage (finds nothing) → Sets `isLoading = false`, `data = null` → `renderStep()` sees `!data` → Renders loader forever
- **Returning User with Draft**: User clicks "Create Free Invoice Now" → Popup opens → Hook loads from localStorage (finds draft) → Sets `isLoading = false`, `data = <draft>` → `renderStep()` sees `data` exists → Renders appropriate wizard step (works correctly)
- **During Initial Load**: Popup opens → Hook is loading → `isLoading = true`, `data = null` → `renderStep()` sees `!data` → Renders loader (correct behavior during actual loading)
- **Edge Case - Corrupted localStorage**: Hook loads corrupted data → Catches error → Sets `isLoading = false`, `data = null` → Same infinite loader issue

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Draft restoration must continue to work when saved data exists in localStorage
- The loader must continue to display during the actual loading process (when `isLoadingData` is `true`)
- Auto-save functionality must continue to work with the debounced delay
- Clear Draft button must continue to clear localStorage and reset to the first step
- All wizard step navigation and data updates must continue to work as before

**Scope:**
All inputs that do NOT involve the initial render with no saved draft should be completely unaffected by this fix. This includes:
- Users with existing drafts in localStorage
- The actual loading state while data is being fetched
- All wizard step interactions after initial render
- Auto-save, clear draft, and navigation functionality

## Hypothesized Root Cause

Based on the code analysis, the root cause is clear:

1. **Incorrect Loading State Check**: The `renderStep()` function (line 127-134) checks `if (!data)` to determine whether to show the loader, but this conflates two distinct states:
   - "Currently loading from localStorage" (should show loader)
   - "Finished loading, no data found" (should show first step)

2. **Missing Data Initialization**: The `useGuestInvoice` hook correctly sets `isLoading = false` after loading completes, but it doesn't initialize `data` to an empty structure when no saved draft is found. The hook's `updateData` function does have initialization logic (lines 73-86), but this is only triggered when `updateData` is called, not on initial load.

3. **Semantic Confusion**: The component treats `null` data as a loading indicator rather than as "no data yet". The `isLoadingData` flag exists specifically to indicate loading state, but `renderStep()` doesn't use it.

## Correctness Properties

Property 1: Fault Condition - Display First Step When No Draft Exists

_For any_ state where loading has completed (`isLoadingData === false`) and no saved draft exists (`data === null`), the fixed `renderStep()` function SHALL display the first wizard step (Company Details) instead of the loader, allowing new users to begin creating an invoice.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Draft Restoration and Loading State

_For any_ state where a saved draft exists in localStorage OR where loading is still in progress (`isLoadingData === true`), the fixed code SHALL produce exactly the same behavior as the original code, preserving draft restoration, loader display during actual loading, auto-save, and all wizard functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

There are two viable approaches to fix this bug. Both are minimal and targeted:

**Approach 1: Check Loading Flag Instead of Data (Recommended)**

**File**: `src/components/guest/GuestInvoiceBuilder.tsx`

**Function**: `renderStep()` (lines 127-134)

**Specific Changes**:
1. **Change Loading Condition**: Replace `if (!data)` with `if (isLoadingData)` in the `renderStep()` function
   - This correctly checks whether data is actively being loaded
   - When loading completes with no data, the function will fall through to the switch statement
   - The switch statement will handle `currentStep === 'company'` and render the first step

2. **Handle Null Data in Steps**: Ensure each step component can handle `null` data gracefully
   - `CompanyDetailsStep` already accepts `data={data.company}` which can be `null`
   - Other steps may need null checks, but `useWizardStep` should initialize to 'company' step when data is null

**Approach 2: Initialize Data in Hook**

**File**: `src/hooks/useGuestInvoice.ts`

**Function**: `useEffect` for loading (lines 38-48)

**Specific Changes**:
1. **Initialize Empty Data**: When `loadFromLocalStorage()` returns `null`, initialize `data` with an empty structure instead of leaving it as `null`
   - This matches the initialization logic already present in `updateData` (lines 73-86)
   - Ensures `data` is never `null` after loading completes

**Recommended Approach**: Approach 1 is cleaner because:
- It's a one-line change with clear semantics
- It properly uses the `isLoadingData` flag for its intended purpose
- It doesn't create unnecessary data structures in localStorage
- It maintains the distinction between "no data yet" and "empty data"

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the root cause is the incorrect loading state check in `renderStep()`.

**Test Plan**: Write tests that simulate opening the popup with no saved draft in localStorage. Mock the `useGuestInvoice` hook to return `{ data: null, isLoadingData: false }`. Run these tests on the UNFIXED code to observe that the loader is rendered instead of the first step.

**Test Cases**:
1. **New User - No Draft**: Mock `useGuestInvoice` to return `data: null, isLoadingData: false` → Expect loader to render (will fail on unfixed code - infinite loader)
2. **Corrupted localStorage**: Mock `loadFromLocalStorage` to throw error → Expect first step to render after error handling (will fail on unfixed code)
3. **Empty localStorage**: Clear localStorage before test → Open popup → Expect first step after loading completes (will fail on unfixed code)
4. **Timing Test**: Verify that `isLoadingData` transitions from `true` to `false` correctly (should pass, confirms hook works)

**Expected Counterexamples**:
- The loader component (`<Loader2>`) is rendered when `data === null` and `isLoadingData === false`
- The `CompanyDetailsStep` is NOT rendered even though loading has completed
- Root cause confirmed: `renderStep()` checks `!data` instead of `isLoadingData`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL state WHERE isBugCondition(state) DO
  result := renderStep_fixed(state)
  ASSERT result.type === CompanyDetailsStep
  ASSERT result.type !== Loader2
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL state WHERE NOT isBugCondition(state) DO
  ASSERT renderStep_original(state) = renderStep_fixed(state)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across different states (loading, with draft, different steps)
- It catches edge cases that manual unit tests might miss (e.g., different step combinations, partial data)
- It provides strong guarantees that behavior is unchanged for all non-buggy states

**Test Plan**: Observe behavior on UNFIXED code first for draft restoration and loading states, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Draft Restoration Preservation**: Mock `useGuestInvoice` to return existing draft data → Verify appropriate step is rendered (not always 'company')
2. **Loading State Preservation**: Mock `isLoadingData: true` → Verify loader is displayed during actual loading
3. **Auto-Save Preservation**: Interact with wizard steps → Verify `updateData` is called and debounced save occurs
4. **Clear Draft Preservation**: Click "Clear Draft" button → Verify `clearData` is called and step resets to 'company'
5. **Step Navigation Preservation**: Navigate through wizard steps with data → Verify all steps render correctly

### Unit Tests

- Test `renderStep()` with `isLoadingData: true` → Should render loader
- Test `renderStep()` with `isLoadingData: false, data: null` → Should render CompanyDetailsStep (first step)
- Test `renderStep()` with `isLoadingData: false, data: <draft>` → Should render appropriate step based on `currentStep`
- Test that `useGuestInvoice` hook sets `isLoading: false` after loading completes
- Test edge case: corrupted localStorage data handling

### Property-Based Tests

- Generate random draft states (with/without data, different steps) and verify correct step is rendered
- Generate random loading states and verify loader is only shown when `isLoadingData: true`
- Test that all wizard interactions (next, back, edit) work correctly across many scenarios
- Verify auto-save behavior is preserved across random user interactions

### Integration Tests

- Test full flow: Open popup (no draft) → See first step → Fill out wizard → Verify auto-save → Close and reopen → Verify draft restored
- Test clear draft flow: Open popup (with draft) → Click "Clear Draft" → Verify reset to first step
- Test error handling: Simulate localStorage errors → Verify graceful degradation
- Test that visual feedback (notifications, step indicator) works correctly throughout the flow
