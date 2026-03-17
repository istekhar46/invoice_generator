# Requirements Document: Guest Invoice Generation

## Feature Overview

Enable anonymous users to create and download professional invoices directly from the landing page without requiring authentication or account creation.

## Functional Requirements

### FR-1: Landing Page Integration

**FR-1.1**: Add a new "Guest Invoice Generator" section to the landing page positioned immediately below the hero section

**FR-1.2**: The section shall include:
- Heading: "Try Our Invoice Generator"
- Subheading describing the feature
- Call-to-action button: "Create Free Invoice"
- Visual preview or illustration of invoice generation

**FR-1.3**: The section shall be visually distinct from other landing page sections with appropriate spacing and styling

**FR-1.4**: The section shall be responsive and display correctly on mobile, tablet, and desktop devices

### FR-2: Guest Invoice Builder Component

**FR-2.1**: Implement a multi-step wizard with 5 steps:
1. Company Details (optional)
2. Customer Details (required)
3. Invoice Details (required)
4. Line Items (required)
5. Review & Download (required)

**FR-2.2**: Each step shall display:
- Step indicator showing current position in workflow
- Step title and description
- Form fields appropriate to the step
- Navigation buttons (Previous/Next)
- Validation errors inline with fields

**FR-2.3**: Users shall be able to navigate backward to previous steps to modify data

**FR-2.4**: Users shall not be able to proceed to the next step if current step validation fails

**FR-2.5**: The wizard shall display a visual progress indicator showing completed, current, and upcoming steps

### FR-3: Company Details Step (Optional)

**FR-3.1**: Provide input fields for:
- Business Name
- Email
- Address
- City
- State/Province
- Postal Code
- Phone
- Tax/VAT Number

**FR-3.2**: All company fields shall be optional

**FR-3.3**: Users shall be able to skip this step entirely

**FR-3.4**: If provided, email shall be validated for correct format

**FR-3.5**: If provided, phone shall be validated for correct format

### FR-4: Customer Details Step (Required)

**FR-4.1**: Provide input fields for:
- Customer Name (required)
- Email (optional)
- Phone (optional)
- Address (optional)
- City (optional)
- State/Province (optional)
- Postal Code (optional)

**FR-4.2**: Customer Name shall be required with minimum 2 characters

**FR-4.3**: If provided, email shall be validated for correct format

**FR-4.4**: If provided, phone shall be validated for correct format

**FR-4.5**: Display validation errors immediately when field loses focus

### FR-5: Invoice Details Step (Required)

**FR-5.1**: Provide input fields for:
- Service Date (required)
- Due Date (required)
- Tax Rate (required, default 8%)
- Notes (optional)

**FR-5.2**: Service Date shall be required and accept valid date format

**FR-5.3**: Due Date shall be required and must be on or after Service Date

**FR-5.4**: Tax Rate shall be required, accept percentage input (0-100%), and default to 8%

**FR-5.5**: Notes shall be optional with maximum 1000 characters

**FR-5.6**: Display validation error if Due Date is before Service Date

### FR-6: Line Items Step (Required)

**FR-6.1**: Provide a table interface for managing line items with columns:
- Type (Material/Labor)
- Description
- Quantity
- Rate
- Amount (calculated)

**FR-6.2**: Users shall be able to add new line items

**FR-6.3**: Users shall be able to edit existing line items

**FR-6.4**: Users shall be able to delete line items

**FR-6.5**: At least one line item shall be required to proceed

**FR-6.6**: Each line item shall validate:
- Description: required, minimum 3 characters
- Quantity: required, must be > 0
- Rate: required, must be >= 0
- Type: required, must be "Material" or "Labor"

**FR-6.7**: Amount shall be automatically calculated as Quantity × Rate

**FR-6.8**: Display real-time invoice totals:
- Subtotal (sum of all line item amounts)
- Tax Amount (subtotal × tax rate)
- Total (subtotal + tax amount)

**FR-6.9**: All monetary amounts shall be displayed with 2 decimal places

### FR-7: Review & Download Step

**FR-7.1**: Display a formatted preview of the complete invoice including:
- Company information (if provided)
- Invoice number (auto-generated)
- Service date and due date
- Customer information
- Line items table
- Subtotal, tax amount, and total
- Notes (if provided)

**FR-7.2**: The preview shall match the final PDF layout and formatting

**FR-7.3**: Provide a "Download PDF" button

**FR-7.4**: Provide a "Print" button as alternative to PDF download

**FR-7.5**: Provide an "Edit" option to return to previous steps

**FR-7.6**: Display a "Sign Up to Save Online" call-to-action button

### FR-8: PDF Generation

**FR-8.1**: Generate a professional PDF invoice when user clicks "Download PDF"

**FR-8.2**: The PDF shall include:
- Company header with logo placeholder (if company provided)
- Invoice number and dates
- Customer billing information
- Itemized line items table
- Subtotal, tax breakdown, and total
- Notes section (if provided)
- Professional formatting and layout

**FR-8.3**: PDF filename shall be: `invoice-{timestamp}.pdf`

**FR-8.4**: PDF generation shall occur client-side without server interaction

**FR-8.5**: Display loading indicator during PDF generation

**FR-8.6**: Automatically trigger browser download when PDF is ready

**FR-8.7**: PDF generation shall complete within 5 seconds for invoices with up to 50 line items

### FR-9: Local Storage Persistence

**FR-9.1**: Automatically save form data to browser localStorage after each change

**FR-9.2**: Implement debounced auto-save with 500ms delay to reduce write frequency

**FR-9.3**: Restore saved draft data when user returns to the page

**FR-9.4**: Display notification when draft is restored: "Draft restored from {date}"

**FR-9.5**: Provide "Clear Draft" button to manually delete saved data

**FR-9.6**: Automatically clear draft data after successful PDF download (with user confirmation)

**FR-9.7**: Store data under key: `guest_invoice_draft`

**FR-9.8**: Handle localStorage quota exceeded errors gracefully

### FR-10: Sign Up Integration

**FR-10.1**: Provide "Sign Up to Save Online" button in review step

**FR-10.2**: When clicked, redirect to signup page with draft data preserved

**FR-10.3**: After signup, automatically create invoice in user's account from draft data

**FR-10.4**: Clear guest draft data after successful account creation

### FR-11: Validation and Error Handling

**FR-11.1**: Display inline validation errors for each field

**FR-11.2**: Display summary of errors at top of form when user attempts invalid progression

**FR-11.3**: Prevent form submission if any validation errors exist

**FR-11.4**: Provide clear, actionable error messages

**FR-11.5**: Handle localStorage errors without breaking functionality

**FR-11.6**: Handle PDF generation errors with fallback to print dialog

**FR-11.7**: Display browser compatibility warnings for unsupported browsers

## Non-Functional Requirements

### NFR-1: Performance

**NFR-1.1**: Initial page load shall complete within 3 seconds on 3G connection

**NFR-1.2**: Step transitions shall occur within 200ms

**NFR-1.3**: Form auto-save shall not cause perceptible UI lag

**NFR-1.4**: PDF generation shall complete within 5 seconds for typical invoices (< 50 items)

**NFR-1.5**: Component shall support up to 100 line items without performance degradation

### NFR-2: Usability

**NFR-2.1**: Interface shall be intuitive for first-time users without instructions

**NFR-2.2**: Form fields shall have clear labels and placeholder text

**NFR-2.3**: Validation errors shall be displayed immediately and clearly

**NFR-2.4**: Progress indicator shall clearly show current position in workflow

**NFR-2.5**: All interactive elements shall have appropriate hover and focus states

**NFR-2.6**: Keyboard navigation shall be fully supported

**NFR-2.7**: Tab order shall follow logical flow through form fields

### NFR-3: Accessibility

**NFR-3.1**: Component shall meet WCAG 2.1 Level AA standards

**NFR-3.2**: All form fields shall have associated labels

**NFR-3.3**: Error messages shall be announced to screen readers

**NFR-3.4**: Color shall not be the only means of conveying information

**NFR-3.5**: Minimum contrast ratio of 4.5:1 for text

**NFR-3.6**: All interactive elements shall be keyboard accessible

**NFR-3.7**: Focus indicators shall be clearly visible

### NFR-4: Responsive Design

**NFR-4.1**: Layout shall adapt to screen sizes from 320px to 2560px width

**NFR-4.2**: Mobile devices (< 768px): Single column layout, stacked form fields

**NFR-4.3**: Tablet devices (768px - 1024px): Two column layout where appropriate

**NFR-4.4**: Desktop devices (> 1024px): Optimized multi-column layout

**NFR-4.5**: Touch targets shall be minimum 44×44 pixels on mobile

**NFR-4.6**: Text shall be readable without zooming on all devices

### NFR-5: Browser Compatibility

**NFR-5.1**: Support latest 2 versions of Chrome, Firefox, Safari, Edge

**NFR-5.2**: Gracefully degrade on older browsers with feature detection

**NFR-5.3**: Display compatibility warning for unsupported browsers

**NFR-5.4**: Require localStorage, Blob API, and modern JavaScript support

### NFR-6: Security

**NFR-6.1**: All user input shall be sanitized before rendering

**NFR-6.2**: Prevent XSS attacks through proper escaping

**NFR-6.3**: No sensitive data shall be transmitted to backend for guest users

**NFR-6.4**: LocalStorage data shall be scoped to application domain

**NFR-6.5**: PDF generation shall occur entirely client-side

**NFR-6.6**: No tracking or analytics on invoice content

### NFR-7: Data Privacy

**NFR-7.1**: Guest invoice data shall remain entirely client-side

**NFR-7.2**: No data shall be transmitted to servers unless user signs up

**NFR-7.3**: Users shall have option to clear all stored data

**NFR-7.4**: Privacy policy shall clearly explain data handling

**NFR-7.5**: No cookies shall be set for guest invoice feature

### NFR-8: Maintainability

**NFR-8.1**: Code shall follow project coding standards and conventions

**NFR-8.2**: Components shall be modular and reusable

**NFR-8.3**: Business logic shall be separated from presentation

**NFR-8.4**: All functions shall have TypeScript type definitions

**NFR-8.5**: Complex logic shall include inline comments

**NFR-8.6**: Unit test coverage shall be minimum 80%

### NFR-9: Scalability

**NFR-9.1**: Component shall handle up to 100 line items efficiently

**NFR-9.2**: LocalStorage usage shall not exceed 1MB per draft

**NFR-9.3**: PDF generation shall scale linearly with line item count

**NFR-9.4**: Memory usage shall remain stable during extended use

## User Stories

### US-1: Quick Invoice Creation
**As a** freelancer without an account  
**I want to** create a professional invoice quickly  
**So that** I can bill my client without signing up

**Acceptance Criteria**:
- Can access invoice builder from landing page
- Can complete invoice in under 5 minutes
- Can download PDF without creating account
- Invoice looks professional and complete

### US-2: Draft Persistence
**As a** guest user  
**I want to** save my progress automatically  
**So that** I don't lose my work if I close the browser

**Acceptance Criteria**:
- Form data saves automatically as I type
- Draft is restored when I return to the page
- Can see when draft was last saved
- Can manually clear draft if desired

### US-3: Mobile Invoice Creation
**As a** mobile user  
**I want to** create invoices on my phone  
**So that** I can bill clients while on the go

**Acceptance Criteria**:
- All form fields are accessible on mobile
- Layout adapts to small screens
- Touch targets are appropriately sized
- Can download PDF on mobile device

### US-4: Optional Company Details
**As a** sole proprietor  
**I want to** skip company details  
**So that** I can create invoices faster with just my name

**Acceptance Criteria**:
- Can skip company details step
- Invoice generates without company information
- Can optionally add company details later
- No validation errors when skipping

### US-5: Upgrade to Full Account
**As a** guest user who likes the tool  
**I want to** sign up and save my invoice  
**So that** I can access it later and create more invoices

**Acceptance Criteria**:
- Can click "Sign Up to Save" from review step
- Draft data is preserved during signup
- Invoice is created in my account after signup
- Guest draft is cleared after account creation

### US-6: Error Recovery
**As a** user with a slow connection  
**I want to** see clear error messages  
**So that** I know what went wrong and how to fix it

**Acceptance Criteria**:
- Validation errors are clear and actionable
- PDF generation errors offer alternatives
- LocalStorage errors don't break the app
- Can retry failed operations

## Constraints

### Technical Constraints

**TC-1**: Must use existing React, TypeScript, and Tailwind CSS stack

**TC-2**: Must integrate with existing landing page without breaking current functionality

**TC-3**: Must reuse existing UI components (Button, Input, Card, etc.)

**TC-4**: Must follow existing project structure and naming conventions

**TC-5**: PDF generation must be client-side only (no backend processing)

**TC-6**: Must work without authentication or backend API calls

### Business Constraints

**BC-1**: Feature must be free for all users (no payment required)

**BC-2**: Must not cannibalize paid features (keep advanced features for authenticated users)

**BC-3**: Must encourage signup through strategic CTAs

**BC-4**: Must maintain brand consistency with existing design

### Design Constraints

**DC-1**: Must match existing landing page visual style

**DC-2**: Must use existing color palette and typography

**DC-3**: Must maintain consistent spacing and layout patterns

**DC-4**: Must use existing icon library (Lucide React)

### Regulatory Constraints

**RC-1**: Must comply with GDPR (no data collection without consent)

**RC-2**: Must comply with CCPA (clear data handling practices)

**RC-3**: Must meet accessibility standards (WCAG 2.1 Level AA)

**RC-4**: Generated invoices must be suitable for tax purposes

## Assumptions

**A-1**: Users have modern browsers with localStorage support

**A-2**: Users understand basic invoicing concepts (line items, tax, etc.)

**A-3**: Users have stable internet connection for initial page load

**A-4**: Users will primarily create simple invoices (< 20 line items)

**A-5**: Most users will complete invoice in single session

**A-6**: Users accessing from landing page are potential customers

**A-7**: PDF download is preferred over email delivery for guest users

## Dependencies

### Internal Dependencies

**ID-1**: Existing UI component library (Button, Input, Card, etc.)

**ID-2**: Existing form validation utilities

**ID-3**: Existing type definitions (Invoice, LineItem, etc.)

**ID-4**: Existing styling system (Tailwind CSS configuration)

**ID-5**: Existing routing system (React Router)

### External Dependencies

**ED-1**: React (^18.x) - UI framework

**ED-2**: react-hook-form (^7.x) - Form state management

**ED-3**: zod (^3.x) - Schema validation

**ED-4**: PDF generation library (jsPDF or @react-pdf/renderer)

**ED-5**: lucide-react - Icon library

**ED-6**: date-fns - Date manipulation (if needed)

### Browser API Dependencies

**BD-1**: localStorage - Draft persistence

**BD-2**: Blob API - PDF file handling

**BD-3**: URL.createObjectURL - PDF download

**BD-4**: window.print() - Fallback PDF generation

## Success Metrics

### Engagement Metrics

**EM-1**: Number of guest invoices created per week

**EM-2**: Completion rate (users who start vs. finish invoice)

**EM-3**: Average time to complete invoice

**EM-4**: Step abandonment rates (which steps users quit on)

**EM-5**: Draft restoration rate (users returning to saved drafts)

### Conversion Metrics

**CM-1**: Signup conversion rate from guest invoice users

**CM-2**: Time from invoice creation to signup

**CM-3**: Percentage of users who click "Sign Up to Save"

### Quality Metrics

**QM-1**: Error rate (validation errors, PDF generation failures)

**QM-2**: Browser compatibility issues reported

**QM-3**: Performance metrics (load time, PDF generation time)

**QM-4**: User satisfaction score (if survey implemented)

### Technical Metrics

**TM-1**: Code coverage (target: 80%+)

**TM-2**: Bundle size impact (target: < 100KB additional)

**TM-3**: Lighthouse performance score (target: 90+)

**TM-4**: Accessibility audit score (target: 100)

## Out of Scope

**OS-1**: Email delivery of invoices (guest users must download)

**OS-2**: Invoice templates or customization options

**OS-3**: Multi-currency support (USD only for MVP)

**OS-4**: Recurring invoices or payment tracking

**OS-5**: Invoice editing after download (must create new invoice)

**OS-6**: Collaboration features (sharing, commenting)

**OS-7**: Integration with accounting software

**OS-8**: Payment processing or payment links

**OS-9**: Invoice history or management for guest users

**OS-10**: Advanced tax calculations (flat rate only)

## Future Enhancements

**FE-1**: Invoice templates with different designs

**FE-2**: Multi-currency support

**FE-3**: Email delivery option for guest users

**FE-4**: QR code for payment on invoice

**FE-5**: Invoice preview before each step

**FE-6**: Bulk line item import from CSV

**FE-7**: Company logo upload for guest users

**FE-8**: Save multiple drafts (not just one)

**FE-9**: Export draft as JSON for backup

**FE-10**: Social sharing of invoice (with privacy controls)
