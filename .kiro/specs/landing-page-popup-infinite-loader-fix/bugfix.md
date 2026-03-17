# Bugfix Requirements Document

## Introduction

When users click "Create Free Invoice Now" on the landing page, a popup appears with the guest invoice builder. However, when there is no saved draft in localStorage, the popup displays an infinite loader instead of showing the first step of the invoice creation wizard. This prevents new users from creating invoices and blocks the primary conversion flow.

The root cause is that the `GuestInvoiceBuilder` component checks if `data` is null to display a loader, but `data` legitimately remains null when no draft exists in localStorage. The component should either initialize empty data or properly handle the loading state to allow new users to proceed.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user clicks "Create Free Invoice Now" and no draft exists in localStorage THEN the system displays an infinite loader in the popup

1.2 WHEN the `useGuestInvoice` hook completes loading and finds no saved data THEN the system keeps `data` as null and continues showing the loader indefinitely

1.3 WHEN the `renderStep()` function evaluates `!data` as true THEN the system renders the loader component instead of the first wizard step

### Expected Behavior (Correct)

2.1 WHEN a user clicks "Create Free Invoice Now" and no draft exists in localStorage THEN the system SHALL display the first step (Company Details) of the invoice wizard

2.2 WHEN the `useGuestInvoice` hook completes loading and finds no saved data THEN the system SHALL initialize with empty/default data structure to allow the wizard to render

2.3 WHEN the `renderStep()` function evaluates the data state THEN the system SHALL check the `isLoadingData` flag instead of checking if `data` is null, or ensure `data` is always initialized

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user clicks "Create Free Invoice Now" and a draft exists in localStorage THEN the system SHALL CONTINUE TO restore the saved draft and display the appropriate wizard step

3.2 WHEN the `useGuestInvoice` hook is loading data from localStorage THEN the system SHALL CONTINUE TO show the loader during the actual loading process

3.3 WHEN a user completes any wizard step and the data is updated THEN the system SHALL CONTINUE TO auto-save to localStorage with the debounced delay

3.4 WHEN a user clicks "Clear Draft" THEN the system SHALL CONTINUE TO clear localStorage and reset to the first step
