# Design Document: Homepage Integration

## Overview

This design document outlines the implementation approach for integrating a marketing homepage into the Invoice Pro application. The homepage will serve as the primary landing page for unauthenticated visitors, featuring a hero section with imagery, a features showcase, and call-to-action elements. The implementation will leverage existing application patterns including React Router for navigation, Tailwind CSS for styling, and the established component architecture.

The homepage will be a public route that displays only to unauthenticated users. Authenticated users visiting the root URL will be automatically redirected to the dashboard, maintaining the existing user experience for logged-in users.

## Architecture

### Component Hierarchy

```
HomePage (src/pages/HomePage.tsx)
├── Hero Section
│   ├── Text Content (headline, subheadline)
│   ├── CTA Buttons (Button component)
│   └── Hero Image (hero_image.png)
├── Features Section
│   ├── Section Heading
│   └── Feature Cards (3x)
│       ├── Icon (React Icons)
│       ├── Title
│       └── Description
└── CTA Section
    ├── Heading
    ├── Description Text
    └── CTA Button (Button component)
```

### Routing Architecture

The homepage will integrate into the existing React Router configuration:

```
/ (root)
├── Unauthenticated: HomePage (Public Route)
└── Authenticated: Redirect to /dashboard

/login (existing)
/signup (existing)
/dashboard (existing, protected)
```

### File Structure

```
src/
├── pages/
│   ├── HomePage.tsx          (new)
│   └── index.ts              (updated - export HomePage)
├── routes/
│   └── index.tsx             (updated - add homepage route)
├── assets/
│   └── hero_image.png        (existing)
└── components/
    └── ui/
        └── Button.tsx        (existing - reused)
```

## Components and Interfaces

### HomePage Component

**Location:** `src/pages/HomePage.tsx`

**Type Definition:**
```typescript
import React from 'react';

export const HomePage: React.FC = () => {
  // Component implementation
}
```

**Props:** None (stateless component)

**State:** None (no local state required)

**Hooks Used:**
- `useNavigate()` from 'react-router-dom' - for programmatic navigation to signup/login

**Dependencies:**
- React Icons: `react-icons/ci`, `react-icons/io5`, `react-icons/bs`
- React Router: `react-router-dom`
- UI Components: `src/components/ui/Button`
- Assets: `src/assets/hero_image.png`

### Section Components

The homepage will be implemented as a single component with three distinct sections, each using semantic HTML and Tailwind CSS:

**Hero Section:**
- Container: `<section>` with gray background
- Layout: CSS Grid (2 columns on md+, 1 column on mobile)
- Left: Text content and CTAs
- Right: Hero image display

**Features Section:**
- Container: `<section>` with white background
- Layout: CSS Grid (3 columns on md+, 1 column on mobile)
- Children: 3 feature cards with icon, title, description

**CTA Section:**
- Container: `<section>` with blue background
- Layout: Centered content with max-width constraint
- Children: Heading, description, CTA button

### Button Component Integration

The existing Button component from `src/components/ui/Button` will be reused for all CTAs. Based on the application patterns, the Button component likely supports:

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

Usage in HomePage:
```typescript
<Button 
  variant="primary" 
  size="lg" 
  onClick={() => navigate('/signup')}
>
  Start Invoicing for Free
</Button>
```

## Data Models

### Navigation State

The homepage does not manage complex data models. Navigation state is handled by React Router:

```typescript
// Navigation hook
const navigate = useNavigate();

// Navigation actions
const handleSignupClick = () => navigate('/signup');
const handleLoginClick = () => navigate('/login');
```

### Asset Imports

```typescript
// Static asset import
import heroImage from '../assets/hero_image.png';

// Icon imports
import { CiStopwatch } from 'react-icons/ci';
import { IoRibbonOutline } from 'react-icons/io5';
import { BsCloudDownload } from 'react-icons/bs';
```

### Feature Data Structure

Features will be defined as a constant array within the component:

```typescript
const features = [
  {
    id: 'fast-creation',
    icon: CiStopwatch,
    title: 'Lightning Fast Creation',
    description: 'Use pre-saved client details and templates to generate a new invoice in under 30 seconds.'
  },
  {
    id: 'professional',
    icon: IoRibbonOutline,
    title: 'Look Like a Pro',
    description: 'Impress clients with sleek, branded PDF invoices that look wonderful on any device.'
  },
  {
    id: 'instant-pdf',
    icon: BsCloudDownload,
    title: 'Instant PDF Downloads',
    description: 'Generate secure PDFs instantly with one click, ready to email or print immediately.'
  }
] as const;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authenticated User Redirection

*For any* authenticated user who navigates to the root URL ("/"), the system should redirect them to "/dashboard" without displaying the homepage content.

**Validates: Requirements 6.2**

### Property 2: Unauthenticated User Homepage Display

*For any* unauthenticated user who navigates to the root URL ("/"), the system should display the HomePage component with all three sections visible.

**Validates: Requirements 6.1**

### Property 3: Navigation Button Functionality

*For any* CTA button click on the homepage, the system should navigate to the correct destination route ("/signup" for signup CTAs, "/login" for login link).

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 4: Hero Image Display

*For any* render of the Hero Section, the hero image should be displayed with the correct source path and appropriate alt text for accessibility.

**Validates: Requirements 8.2, 8.3**

### Property 5: Feature Cards Completeness

*For any* render of the Features Section, exactly three feature cards should be displayed, each containing an icon, title, and description.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

### Property 6: Responsive Layout Behavior

*For any* viewport width, the homepage sections should display in the appropriate layout (grid on medium+ screens, stacked on mobile).

**Validates: Requirements 2.6, 2.7, 3.6, 3.7, 7.2**

### Property 7: Required Content Presence

*For any* render of the homepage, all required text content (headlines, descriptions, button labels) should be present and match the specified copy.

**Validates: Requirements 2.1, 2.2, 3.1, 4.1, 4.2, 4.3, 4.4**

## Error Handling

### Asset Loading Failures

**Scenario:** Hero image fails to load

**Handling Strategy:**
```typescript
// Fallback for missing image
<img 
  src={heroImage} 
  alt="Invoice Pro Dashboard Preview"
  onError={(e) => {
    e.currentTarget.src = '/placeholder-image.png'; // Fallback
    e.currentTarget.alt = 'Image unavailable';
  }}
/>
```

**Alternative:** Use a CSS background with a fallback color if the image is critical to the design.

### Missing Icon Library

**Scenario:** react-icons package is not installed

**Handling Strategy:**
- Pre-implementation check: Verify react-icons in package.json
- If missing: Install via `npm install react-icons`
- Build-time error: TypeScript will catch missing imports
- Runtime fallback: Not needed as this is a build-time dependency

### Navigation Errors

**Scenario:** Navigation to signup/login fails

**Handling Strategy:**
- React Router handles invalid routes automatically (404 page)
- No additional error handling needed for navigation
- Routes are statically defined and type-safe

### Responsive Layout Issues

**Scenario:** Layout breaks on specific screen sizes

**Handling Strategy:**
- Use Tailwind's responsive breakpoints (sm, md, lg, xl)
- Test on multiple viewport sizes during development
- Use browser DevTools responsive mode for validation
- Tailwind's mobile-first approach ensures graceful degradation

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases for the HomePage component:

**Test File:** `src/pages/HomePage.test.tsx`

**Test Cases:**

1. **Rendering Test**
   - Verify component renders without crashing
   - Check that all three sections are present in the DOM

2. **Content Verification**
   - Verify hero headline text is correct
   - Verify hero subheadline text is correct
   - Verify all three feature titles are present
   - Verify CTA section heading is present

3. **Navigation Tests**
   - Mock useNavigate hook
   - Simulate click on "Start Invoicing for Free" button
   - Verify navigate('/signup') was called
   - Simulate click on "Create My First Invoice Now" button
   - Verify navigate('/signup') was called
   - Simulate click on "Login here" link
   - Verify navigate('/login') was called

4. **Image Rendering**
   - Verify hero image src attribute is correct
   - Verify hero image has alt text

5. **Icon Rendering**
   - Verify all three feature icons render
   - Check icon components are in the DOM

6. **Responsive Classes**
   - Verify grid classes are applied (md:grid-cols-2, md:grid-cols-3)
   - Verify responsive padding classes are present

**Example Test Structure:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('HomePage', () => {
  it('renders hero section with correct headline', () => {
    render(<BrowserRouter><HomePage /></BrowserRouter>);
    expect(screen.getByText(/Create Professional Invoices/i)).toBeInTheDocument();
  });

  it('navigates to signup when CTA button is clicked', () => {
    render(<BrowserRouter><HomePage /></BrowserRouter>);
    const ctaButton = screen.getByText(/Start Invoicing for Free/i);
    fireEvent.click(ctaButton);
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });
});
```

### Integration Tests

Integration tests will verify the homepage works correctly within the routing system:

**Test File:** `src/routes/homepage.integration.test.tsx`

**Test Cases:**

1. **Unauthenticated User Access**
   - Mock authentication state as unauthenticated
   - Navigate to "/"
   - Verify HomePage component is rendered
   - Verify no redirect occurs

2. **Authenticated User Redirect**
   - Mock authentication state as authenticated
   - Navigate to "/"
   - Verify redirect to "/dashboard" occurs
   - Verify HomePage component is NOT rendered

3. **Route Metadata**
   - Verify routeMetadata includes homepage entry
   - Verify title and breadcrumb are correct

4. **Public Route Wrapper**
   - Verify HomePage is wrapped in PublicRoute component
   - Verify PublicRoute logic executes correctly

**Example Test Structure:**
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { router } from './index';

// Mock auth store
jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

describe('Homepage Routing Integration', () => {
  it('displays homepage for unauthenticated users', async () => {
    // Mock unauthenticated state
    useAuthStore.mockReturnValue({ isAuthenticated: false });
    
    const testRouter = createMemoryRouter(router.routes, {
      initialEntries: ['/'],
    });
    
    render(<RouterProvider router={testRouter} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Create Professional Invoices/i)).toBeInTheDocument();
    });
  });

  it('redirects authenticated users to dashboard', async () => {
    // Mock authenticated state
    useAuthStore.mockReturnValue({ isAuthenticated: true });
    
    const testRouter = createMemoryRouter(router.routes, {
      initialEntries: ['/'],
    });
    
    render(<RouterProvider router={testRouter} />);
    
    await waitFor(() => {
      expect(testRouter.state.location.pathname).toBe('/dashboard');
    });
  });
});
```

### Property-Based Tests

Property-based tests will verify universal properties across various inputs and states:

**Test File:** `src/pages/HomePage.property.test.tsx`

**Property Test Library:** fast-check (for TypeScript/JavaScript)

**Installation:** `npm install --save-dev fast-check`

**Configuration:** Each test should run minimum 100 iterations

**Property Tests:**

1. **Property 1: Authenticated User Redirection**
   - Generate: Random authenticated user states
   - Test: All authenticated users are redirected to /dashboard
   - Tag: **Feature: homepage-integration, Property 1: Authenticated User Redirection**

2. **Property 2: Unauthenticated User Homepage Display**
   - Generate: Random unauthenticated user states
   - Test: All unauthenticated users see the HomePage
   - Tag: **Feature: homepage-integration, Property 2: Unauthenticated User Homepage Display**

3. **Property 3: Navigation Button Functionality**
   - Generate: Random button click events on different CTAs
   - Test: All clicks navigate to correct routes
   - Tag: **Feature: homepage-integration, Property 3: Navigation Button Functionality**

4. **Property 4: Hero Image Display**
   - Generate: Random render cycles
   - Test: Hero image always has correct src and alt attributes
   - Tag: **Feature: homepage-integration, Property 4: Hero Image Display**

5. **Property 5: Feature Cards Completeness**
   - Generate: Random render cycles
   - Test: Exactly 3 feature cards always present with all required fields
   - Tag: **Feature: homepage-integration, Property 5: Feature Cards Completeness**

6. **Property 6: Responsive Layout Behavior**
   - Generate: Random viewport widths (mobile, tablet, desktop)
   - Test: Layout classes adjust appropriately for each breakpoint
   - Tag: **Feature: homepage-integration, Property 6: Responsive Layout Behavior**

7. **Property 7: Required Content Presence**
   - Generate: Random render cycles
   - Test: All required text content is always present
   - Tag: **Feature: homepage-integration, Property 7: Required Content Presence**

**Example Property Test:**
```typescript
import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

describe('HomePage Property Tests', () => {
  // Feature: homepage-integration, Property 5: Feature Cards Completeness
  it('always renders exactly 3 feature cards with complete content', () => {
    fc.assert(
      fc.property(fc.nat(100), (seed) => {
        // Render component multiple times
        const { container } = render(
          <BrowserRouter>
            <HomePage />
          </BrowserRouter>
        );

        // Verify exactly 3 feature cards
        const featureTitles = [
          'Lightning Fast Creation',
          'Look Like a Pro',
          'Instant PDF Downloads'
        ];

        featureTitles.forEach(title => {
          expect(screen.getByText(title)).toBeInTheDocument();
        });

        // Verify each card has an icon (check for icon containers)
        const iconContainers = container.querySelectorAll('svg');
        expect(iconContainers.length).toBeGreaterThanOrEqual(3);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: homepage-integration, Property 7: Required Content Presence
  it('always displays all required text content', () => {
    fc.assert(
      fc.property(fc.nat(100), (seed) => {
        render(
          <BrowserRouter>
            <HomePage />
          </BrowserRouter>
        );

        // Required content array
        const requiredContent = [
          'Create Professional Invoices in Seconds, Not Hours.',
          'Stop struggling with spreadsheets',
          'Everything You Need to Get Paid',
          'Ready to streamline your billing?',
          'No credit card required'
        ];

        requiredContent.forEach(content => {
          expect(screen.getByText(new RegExp(content, 'i'))).toBeInTheDocument();
        });
      }),
      { numRuns: 100 }
    );
  });
});
```

### Manual Testing Checklist

1. **Visual Inspection**
   - [ ] Hero section displays correctly with image
   - [ ] Features section shows all 3 cards with icons
   - [ ] CTA section has blue background and centered content
   - [ ] All text is readable and properly formatted

2. **Responsive Testing**
   - [ ] Test on mobile viewport (375px)
   - [ ] Test on tablet viewport (768px)
   - [ ] Test on desktop viewport (1440px)
   - [ ] Verify grid layouts adjust appropriately

3. **Navigation Testing**
   - [ ] Click "Start Invoicing for Free" → goes to /signup
   - [ ] Click "Login here" → goes to /login
   - [ ] Click "Create My First Invoice Now" → goes to /signup

4. **Authentication Flow**
   - [ ] Visit / while logged out → see homepage
   - [ ] Visit / while logged in → redirect to /dashboard
   - [ ] Log out from dashboard → can navigate back to homepage

5. **Browser Compatibility**
   - [ ] Test in Chrome
   - [ ] Test in Firefox
   - [ ] Test in Safari
   - [ ] Test in Edge

### Testing Tools and Setup

**Required Dependencies:**
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "fast-check": "^3.15.0",
    "vitest": "^1.0.0"
  }
}
```

**Test Configuration:**
- Test runner: Vitest (already configured in the project)
- Test utilities: React Testing Library
- Property testing: fast-check
- Minimum iterations per property test: 100

## Implementation Notes

### Styling Approach

The homepage will use Tailwind CSS utility classes exclusively, maintaining consistency with the existing application. Key styling patterns:

- **Spacing:** Use consistent padding (py-20, px-6) for sections
- **Typography:** Use text-6xl for main headlines, text-2xl for section headings
- **Colors:** Primary blue (blue-600), gray backgrounds (gray-50), white sections
- **Responsive:** Mobile-first approach with md: breakpoints

### Performance Considerations

- **Image Optimization:** Ensure hero_image.png is optimized for web (compressed, appropriate dimensions)
- **Code Splitting:** HomePage will be lazy-loaded as part of the route configuration
- **Icon Loading:** React Icons are tree-shakeable, only used icons will be bundled

### Accessibility

- **Semantic HTML:** Use `<section>`, `<h1>`, `<h2>`, `<h3>` appropriately
- **Alt Text:** Provide descriptive alt text for hero image
- **Keyboard Navigation:** Ensure all buttons are keyboard accessible
- **Focus States:** Maintain visible focus indicators on interactive elements
- **Color Contrast:** Verify text meets WCAG AA standards (4.5:1 ratio)

### Future Enhancements

Potential improvements for future iterations:

1. **Animation:** Add subtle fade-in animations for sections on scroll
2. **Testimonials:** Add a testimonials section with customer quotes
3. **Pricing:** Add a pricing section if multiple tiers are introduced
4. **Video:** Replace static hero image with a product demo video
5. **Analytics:** Add tracking for CTA button clicks and user engagement
6. **A/B Testing:** Test different headlines and CTA copy for conversion optimization
