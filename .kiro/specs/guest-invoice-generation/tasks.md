# Tasks: Guest Invoice Generation

## Phase 1: Foundation & Setup

### 1.1 Type Definitions
- [x] 1.1.1 Create `GuestInvoiceData` interface in types file
- [x] 1.1.2 Create `CompanyDetails` interface for guest company data
- [x] 1.1.3 Create `CustomerDetails` interface for guest customer data
- [x] 1.1.4 Create `InvoiceDetails` interface for guest invoice metadata
- [x] 1.1.5 Create `ValidationResult` interface for validation responses
- [x] 1.1.6 Create `InvoiceTotals` interface for calculated totals
- [x] 1.1.7 Export all guest invoice types from types/index.ts

### 1.2 Validation Schema
- [x] 1.2.1 Create Zod schema for CompanyDetails (all optional fields)
- [x] 1.2.2 Create Zod schema for CustomerDetails (name required)
- [x] 1.2.3 Create Zod schema for InvoiceDetails (dates and tax rate)
- [x] 1.2.4 Create Zod schema for LineItem validation
- [x] 1.2.5 Create Zod schema for complete GuestInvoiceData
- [x] 1.2.6 Add custom validation for due date >= service date
- [x] 1.2.7 Export schemas from types/forms.ts

### 1.3 LocalStorage Utilities
- [x] 1.3.1 Create `utils/guestInvoiceStorage.ts` file
- [x] 1.3.2 Implement `saveToLocalStorage()` function with error handling
- [x] 1.3.3 Implement `loadFromLocalStorage()` function with validation
- [x] 1.3.4 Implement `clearLocalStorage()` function
- [x] 1.3.5 Implement `hasStoredDraft()` function
- [x] 1.3.6 Add date serialization/deserialization helpers
- [x] 1.3.7 Add storage quota error handling
- [x] 1.3.8 Add unit tests for storage utilities (80%+ coverage)

### 1.4 Calculation Utilities
- [x] 1.4.1 Create `utils/invoiceCalculations.ts` file
- [x] 1.4.2 Implement `calculateLineItemAmount()` function
- [x] 1.4.3 Implement `calculateInvoiceTotals()` function
- [x] 1.4.4 Implement `formatCurrency()` helper (if not exists)
- [x] 1.4.5 Implement `roundToTwoDecimals()` helper
- [x] 1.4.6 Add unit tests for calculation utilities (90%+ coverage)

### 1.5 Validation Utilities
- [x] 1.5.1 Create `utils/guestInvoiceValidation.ts` file
- [x] 1.5.2 Implement `validateInvoiceData()` function
- [x] 1.5.3 Implement `validateStep()` function for each wizard step
- [x] 1.5.4 Implement `canProceedToNext()` function
- [x] 1.5.5 Add email format validation helper
- [x] 1.5.6 Add phone format validation helper
- [x] 1.5.7 Add unit tests for validation utilities (85%+ coverage)

## Phase 2: Core Hooks & State Management

### 2.1 Guest Invoice Hook
- [x] 2.1.1 Create `hooks/useGuestInvoice.ts` file
- [x] 2.1.2 Implement state management for GuestInvoiceData
- [x] 2.1.3 Implement `updateData()` function with auto-save
- [x] 2.1.4 Implement `clearData()` function
- [x] 2.1.5 Implement debounced auto-save (500ms delay)
- [x] 2.1.6 Load draft data on mount
- [x] 2.1.7 Return validation state and errors
- [x] 2.1.8 Add unit tests for hook logic

### 2.2 Wizard Step Hook
- [x] 2.2.1 Create `hooks/useWizardStep.ts` file
- [x] 2.2.2 Implement step navigation state
- [x] 2.2.3 Implement `goToNextStep()` function
- [x] 2.2.4 Implement `goToPreviousStep()` function
- [x] 2.2.5 Implement `goToStep()` function for direct navigation
- [x] 2.2.6 Implement step validation before progression
- [x] 2.2.7 Add unit tests for wizard navigation

## Phase 3: PDF Generation

### 3.1 PDF Library Setup
- [x] 3.1.1 Install PDF generation library (jsPDF or @react-pdf/renderer)
- [x] 3.1.2 Create `utils/pdfGeneration.ts` file
- [x] 3.1.3 Configure PDF document settings (page size, margins)
- [x] 3.1.4 Set up fonts and styling constants

### 3.2 PDF Generation Functions
- [x] 3.2.1 Implement `generateInvoiceNumber()` function
- [x] 3.2.2 Implement `addCompanyHeader()` function
- [x] 3.2.3 Implement `addInvoiceMetadata()` function
- [x] 3.2.4 Implement `addCustomerSection()` function
- [x] 3.2.5 Implement `addLineItemsTable()` function
- [x] 3.2.6 Implement `addTotalsSection()` function
- [x] 3.2.7 Implement `addNotesSection()` function
- [x] 3.2.8 Implement main `generateInvoicePDF()` function
- [x] 3.2.9 Implement `downloadPDF()` helper function
- [x] 3.2.10 Add error handling for PDF generation failures
- [x] 3.2.11 Add loading state management
- [x] 3.2.12 Add unit tests for PDF generation logic

## Phase 4: UI Components - Form Steps

### 4.1 Company Details Step Component
- [x] 4.1.1 Create `components/guest/CompanyDetailsStep.tsx`
- [x] 4.1.2 Implement form fields for company information
- [x] 4.1.3 Add field validation with react-hook-form
- [x] 4.1.4 Add "Skip this step" functionality
- [x] 4.1.5 Style with Tailwind CSS matching existing design
- [x] 4.1.6 Add responsive layout (mobile/tablet/desktop)
- [x] 4.1.7 Add accessibility attributes (labels, ARIA)
- [x] 4.1.8 Add unit tests for component

### 4.2 Customer Details Step Component
- [x] 4.2.1 Create `components/guest/CustomerDetailsStep.tsx`
- [x] 4.2.2 Implement form fields for customer information
- [x] 4.2.3 Add required field validation (name)
- [x] 4.2.4 Add optional field validation (email, phone)
- [x] 4.2.5 Display inline validation errors
- [x] 4.2.6 Style with Tailwind CSS
- [x] 4.2.7 Add responsive layout
- [x] 4.2.8 Add accessibility attributes
- [x] 4.2.9 Add unit tests for component

### 4.3 Invoice Details Step Component
- [x] 4.3.1 Create `components/guest/InvoiceDetailsStep.tsx`
- [x] 4.3.2 Implement date picker for service date
- [x] 4.3.3 Implement date picker for due date
- [x] 4.3.4 Implement tax rate input (percentage)
- [x] 4.3.5 Implement notes textarea
- [x] 4.3.6 Add date validation (due date >= service date)
- [x] 4.3.7 Add tax rate validation (0-100%)
- [x] 4.3.8 Display validation errors
- [x] 4.3.9 Style with Tailwind CSS
- [x] 4.3.10 Add responsive layout
- [x] 4.3.11 Add accessibility attributes
- [x] 4.3.12 Add unit tests for component

### 4.4 Line Items Step Component
- [x] 4.4.1 Create `components/guest/LineItemsStep.tsx`
- [x] 4.4.2 Implement line items table with columns
- [x] 4.4.3 Add "Add Item" button functionality
- [x] 4.4.4 Add "Edit Item" functionality
- [x] 4.4.5 Add "Delete Item" functionality
- [x] 4.4.6 Implement automatic amount calculation
- [x] 4.4.7 Display real-time subtotal
- [x] 4.4.8 Display real-time tax amount
- [x] 4.4.9 Display real-time total
- [x] 4.4.10 Add line item validation
- [x] 4.4.11 Require at least one line item
- [x] 4.4.12 Style with Tailwind CSS
- [x] 4.4.13 Add responsive layout (mobile table alternative)
- [x] 4.4.14 Add accessibility attributes
- [x] 4.4.15 Add unit tests for component

### 4.5 Review Step Component
- [x] 4.5.1 Create `components/guest/ReviewStep.tsx`
- [x] 4.5.2 Display formatted invoice preview
- [x] 4.5.3 Show all entered data (company, customer, items)
- [x] 4.5.4 Display calculated totals
- [x] 4.5.5 Add "Download PDF" button
- [x] 4.5.6 Add "Print" button
- [x] 4.5.7 Add "Edit" button to return to steps
- [x] 4.5.8 Add "Sign Up to Save" CTA button
- [x] 4.5.9 Style with Tailwind CSS
- [x] 4.5.10 Add print-friendly CSS
- [x] 4.5.11 Add accessibility attributes
- [x] 4.5.12 Add unit tests for component

## Phase 5: Main Components

### 5.1 Guest Invoice Preview Component
- [x] 5.1.1 Create `components/guest/GuestInvoicePreview.tsx`
- [ ] 5.1.2 Implement invoice layout matching PDF output
- [ ] 5.1.3 Display company header (if provided)
- [ ] 5.1.4 Display invoice number and dates
- [ ] 5.1.5 Display customer information
- [ ] 5.1.6 Display line items table
- [ ] 5.1.7 Display totals section
- [ ] 5.1.8 Display notes (if provided)
- [ ] 5.1.9 Style with Tailwind CSS
- [ ] 5.1.10 Add print-friendly styles
- [ ] 5.1.11 Add unit tests for component

### 5.2 Step Indicator Component
- [x] 5.2.1 Create `components/guest/StepIndicator.tsx`
- [x] 5.2.2 Display all 5 steps with icons
- [x] 5.2.3 Highlight current step
- [x] 5.2.4 Show completed steps with checkmarks
- [x] 5.2.5 Show upcoming steps as inactive
- [x] 5.2.6 Add step titles and descriptions
- [x] 5.2.7 Style with Tailwind CSS
- [x] 5.2.8 Add responsive layout (hide descriptions on mobile)
- [x] 5.2.9 Add accessibility attributes
- [x] 5.2.10 Add unit tests for component

### 5.3 Guest Invoice Builder Component
- [x] 5.3.1 Create `components/guest/GuestInvoiceBuilder.tsx`
- [x] 5.3.2 Integrate useGuestInvoice hook
- [x] 5.3.3 Integrate useWizardStep hook
- [x] 5.3.4 Render StepIndicator component
- [x] 5.3.5 Render current step component based on state
- [x] 5.3.6 Implement Previous/Next navigation buttons
- [x] 5.3.7 Implement step validation before progression
- [x] 5.3.8 Handle PDF download action
- [x] 5.3.9 Handle print action
- [x] 5.3.10 Handle "Sign Up to Save" action
- [x] 5.3.11 Display loading overlay during PDF generation
- [x] 5.3.12 Display success message after download
- [x] 5.3.13 Display error messages
- [x] 5.3.14 Add "Clear Draft" functionality
- [x] 5.3.15 Add draft restoration notification
- [x] 5.3.16 Style with Tailwind CSS
- [x] 5.3.17 Add responsive layout
- [x] 5.3.18 Add accessibility attributes
- [ ] 5.3.19 Add integration tests for full workflow

### 5.4 Guest Invoice Section Component
- [x] 5.4.1 Create `components/guest/GuestInvoiceSection.tsx`
- [x] 5.4.2 Implement section heading and description
- [x] 5.4.3 Add "Create Free Invoice" CTA button
- [x] 5.4.4 Add visual preview or illustration
- [x] 5.4.5 Toggle GuestInvoiceBuilder visibility on click
- [x] 5.4.6 Style with Tailwind CSS matching landing page
- [x] 5.4.7 Add responsive layout
- [x] 5.4.8 Add accessibility attributes
- [ ] 5.4.9 Add unit tests for component

## Phase 6: Landing Page Integration

### 6.1 HomePage Updates
- [x] 6.1.1 Import GuestInvoiceSection component
- [x] 6.1.2 Add GuestInvoiceSection below hero section
- [x] 6.1.3 Ensure proper spacing and layout
- [ ] 6.1.4 Test responsive behavior
- [ ] 6.1.5 Verify no breaking changes to existing sections
- [ ] 6.1.6 Add integration tests for landing page

### 6.2 Modal/Overlay Implementation
- [ ] 6.2.1 Create modal wrapper for GuestInvoiceBuilder (optional)
- [ ] 6.2.2 Implement modal open/close functionality
- [ ] 6.2.3 Add backdrop click to close
- [ ] 6.2.4 Add escape key to close
- [ ] 6.2.5 Prevent body scroll when modal open
- [ ] 6.2.6 Style modal with Tailwind CSS
- [ ] 6.2.7 Add accessibility attributes (focus trap, ARIA)
- [ ] 6.2.8 Add unit tests for modal behavior

## Phase 7: Sign Up Integration

### 7.1 Draft Data Preservation
- [ ] 7.1.1 Create utility to serialize draft data for URL/state
- [ ] 7.1.2 Implement redirect to signup with draft data
- [ ] 7.1.3 Update signup page to accept draft data parameter
- [ ] 7.1.4 Store draft data in signup flow state
- [ ] 7.1.5 Add unit tests for data serialization

### 7.2 Post-Signup Invoice Creation
- [ ] 7.2.1 Create API call to convert guest draft to saved invoice
- [ ] 7.2.2 Implement post-signup hook to create invoice
- [ ] 7.2.3 Clear guest draft after successful creation
- [ ] 7.2.4 Redirect to invoice detail page after creation
- [ ] 7.2.5 Display success message
- [ ] 7.2.6 Add error handling for creation failures
- [ ] 7.2.7 Add integration tests for signup flow

## Phase 8: Error Handling & Edge Cases

### 8.1 LocalStorage Error Handling
- [ ] 8.1.1 Detect localStorage quota exceeded
- [ ] 8.1.2 Display warning message to user
- [ ] 8.1.3 Offer JSON export as backup option
- [ ] 8.1.4 Continue functionality without auto-save
- [ ] 8.1.5 Add unit tests for quota errors

### 8.2 PDF Generation Error Handling
- [ ] 8.2.1 Detect PDF generation failures
- [ ] 8.2.2 Display error message with fallback options
- [ ] 8.2.3 Offer print dialog as alternative
- [ ] 8.2.4 Offer "Sign Up to Save" as alternative
- [ ] 8.2.5 Log errors for debugging
- [ ] 8.2.6 Add unit tests for PDF errors

### 8.3 Browser Compatibility
- [ ] 8.3.1 Detect unsupported browsers
- [ ] 8.3.2 Display compatibility warning
- [ ] 8.3.3 Suggest browser upgrade
- [ ] 8.3.4 Gracefully disable feature if necessary
- [ ] 8.3.5 Add unit tests for feature detection

### 8.4 Corrupted Data Handling
- [ ] 8.4.1 Detect corrupted localStorage data
- [ ] 8.4.2 Clear corrupted data automatically
- [ ] 8.4.3 Log error for debugging
- [ ] 8.4.4 Start with fresh form
- [ ] 8.4.5 Display notification to user
- [ ] 8.4.6 Add unit tests for data corruption scenarios

## Phase 9: Testing & Quality Assurance

### 9.1 Unit Tests
- [ ] 9.1.1 Achieve 80%+ code coverage for utilities
- [ ] 9.1.2 Achieve 70%+ code coverage for components
- [ ] 9.1.3 Test all validation functions
- [ ] 9.1.4 Test all calculation functions
- [ ] 9.1.5 Test localStorage operations
- [ ] 9.1.6 Test PDF generation functions
- [ ] 9.1.7 Run tests in CI/CD pipeline

### 9.2 Integration Tests
- [ ] 9.2.1 Test complete invoice creation workflow
- [ ] 9.2.2 Test draft save and restore
- [ ] 9.2.3 Test PDF download flow
- [ ] 9.2.4 Test signup integration flow
- [ ] 9.2.5 Test error scenarios
- [ ] 9.2.6 Test browser back/forward navigation

### 9.3 Property-Based Tests
- [ ] 9.3.1 Install fast-check library
- [ ] 9.3.2 Create arbitraries for GuestInvoiceData
- [ ] 9.3.3 Test serialization round-trip property
- [ ] 9.3.4 Test totals calculation property
- [ ] 9.3.5 Test validation idempotency property
- [ ] 9.3.6 Test step progression safety property
- [ ] 9.3.7 Run property tests in CI/CD

### 9.4 Accessibility Testing
- [ ] 9.4.1 Run automated accessibility audit (axe-core)
- [ ] 9.4.2 Test keyboard navigation
- [ ] 9.4.3 Test screen reader compatibility
- [ ] 9.4.4 Test focus management
- [ ] 9.4.5 Test color contrast
- [ ] 9.4.6 Verify WCAG 2.1 Level AA compliance
- [ ] 9.4.7 Fix any accessibility issues found

### 9.5 Cross-Browser Testing
- [ ] 9.5.1 Test on Chrome (latest 2 versions)
- [ ] 9.5.2 Test on Firefox (latest 2 versions)
- [ ] 9.5.3 Test on Safari (latest 2 versions)
- [ ] 9.5.4 Test on Edge (latest 2 versions)
- [ ] 9.5.5 Test on mobile browsers (iOS Safari, Chrome Android)
- [ ] 9.5.6 Document any browser-specific issues

### 9.6 Responsive Testing
- [ ] 9.6.1 Test on mobile (320px - 767px)
- [ ] 9.6.2 Test on tablet (768px - 1023px)
- [ ] 9.6.3 Test on desktop (1024px+)
- [ ] 9.6.4 Test on large screens (1920px+)
- [ ] 9.6.5 Verify touch targets on mobile
- [ ] 9.6.6 Verify text readability on all sizes

### 9.7 Performance Testing
- [ ] 9.7.1 Measure initial page load time
- [ ] 9.7.2 Measure step transition time
- [ ] 9.7.3 Measure PDF generation time
- [ ] 9.7.4 Measure bundle size impact
- [ ] 9.7.5 Run Lighthouse audit
- [ ] 9.7.6 Optimize any performance bottlenecks

## Phase 10: Documentation & Deployment

### 10.1 Code Documentation
- [ ] 10.1.1 Add JSDoc comments to all public functions
- [ ] 10.1.2 Add inline comments for complex logic
- [ ] 10.1.3 Document component props with TypeScript
- [ ] 10.1.4 Create README for guest invoice feature
- [ ] 10.1.5 Document localStorage schema
- [ ] 10.1.6 Document PDF generation process

### 10.2 User Documentation
- [ ] 10.2.1 Create user guide for guest invoice feature
- [ ] 10.2.2 Add tooltips for complex form fields
- [ ] 10.2.3 Add help text for validation errors
- [ ] 10.2.4 Create FAQ section
- [ ] 10.2.5 Add privacy policy updates

### 10.3 Deployment Preparation
- [ ] 10.3.1 Review all code changes
- [ ] 10.3.2 Run full test suite
- [ ] 10.3.3 Build production bundle
- [ ] 10.3.4 Verify bundle size is acceptable
- [ ] 10.3.5 Test production build locally
- [ ] 10.3.6 Create deployment checklist

### 10.4 Monitoring & Analytics
- [ ] 10.4.1 Add analytics events for key actions
- [ ] 10.4.2 Track invoice creation completions
- [ ] 10.4.3 Track step abandonment rates
- [ ] 10.4.4 Track PDF download success rate
- [ ] 10.4.5 Track signup conversion rate
- [ ] 10.4.6 Set up error monitoring (Sentry or similar)
- [ ] 10.4.7 Create analytics dashboard

### 10.5 Deployment
- [ ] 10.5.1 Deploy to staging environment
- [ ] 10.5.2 Perform smoke tests on staging
- [ ] 10.5.3 Get stakeholder approval
- [ ] 10.5.4 Deploy to production
- [ ] 10.5.5 Monitor for errors post-deployment
- [ ] 10.5.6 Verify analytics are tracking correctly

### 10.6 Post-Launch
- [ ] 10.6.1 Monitor user feedback
- [ ] 10.6.2 Track success metrics
- [ ] 10.6.3 Identify and fix any bugs
- [ ] 10.6.4 Plan iteration based on data
- [ ] 10.6.5 Document lessons learned
- [ ] 10.6.6 Celebrate launch! 🎉
