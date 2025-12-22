# Design Document

## Overview

This design document outlines the comprehensive modernization of the Electrician Invoice Generation Web Application's user interface and user experience. The modernization transforms the existing functional application into a premium, professional interface that reflects 2025 design standards while maintaining all existing functionality.

The design follows a mobile-first approach with electric blue as the primary brand color, implementing modern design patterns including glass morphism, gradient backgrounds, smooth animations, and responsive layouts. The goal is to create an interface that feels premium, trustworthy, and efficient for electricians managing their business operations.

## Architecture

### Design System Foundation

The modernization is built on a comprehensive design system that includes:

- **Color System**: Electric blue primary palette with supporting colors for different states
- **Typography Scale**: Responsive typography that adapts from mobile to desktop
- **Spacing System**: Consistent spacing scale using Tailwind's spacing tokens
- **Component Library**: Modernized components with consistent styling and behavior
- **Animation System**: Subtle micro-interactions and transitions for enhanced UX

### Technology Stack

- **Styling**: Tailwind CSS with custom configuration for modern design tokens
- **Components**: React components with TypeScript for type safety
- **Animations**: CSS transitions and keyframe animations for smooth interactions
- **Responsive Design**: Mobile-first breakpoint system with fluid layouts
- **Accessibility**: WCAG 2.1 AA compliance with proper contrast and touch targets

## Components and Interfaces

### Core Design Tokens

#### Color Palette
```typescript
// Primary Brand Colors - Electric Blue
primary: {
  50: '#eff6ff',
  100: '#dbeafe', 
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',  // Main brand color
  600: '#2563eb',  // Hover states
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
  950: '#172554',
}

// Secondary - Amber/Warning
secondary: {
  500: '#f59e0b',  // Accent color
  600: '#d97706',
}

// Success - Green
success: {
  500: '#22c55e',  // Paid status
  600: '#16a34a',
}

// Danger - Red  
danger: {
  500: '#ef4444',  // Delete/Error
  600: '#dc2626',
}

// Neutral - Modern slate tones
gray: {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
}
```

#### Typography System
```css
/* Responsive base font sizes */
html {
  font-size: 14px; /* Mobile base */
}

@media (min-width: 640px) {
  html { font-size: 15px; } /* Tablet */
}

@media (min-width: 1024px) {
  html { font-size: 16px; } /* Desktop */
}

/* Fluid typography scale */
h1: text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight
h2: text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight  
h3: text-xl sm:text-2xl lg:text-3xl font-semibold
p: text-base sm:text-lg leading-relaxed
```

#### Spacing and Layout
```css
/* Consistent spacing scale */
spacing: {
  xs: '0.5rem',   // 8px
  sm: '0.75rem',  // 12px  
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
}

/* Responsive breakpoints */
screens: {
  'xs': '475px',    // Extra small phones
  'sm': '640px',    // Small devices (landscape phones)
  'md': '768px',    // Medium devices (tablets)  
  'lg': '1024px',   // Large devices (laptops)
  'xl': '1280px',   // Extra large devices (desktops)
  '2xl': '1536px',  // 2X large devices (large desktops)
}
```

### Modernized Components

#### Button Component
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md',
  children,
  className,
  disabled,
  onClick 
}) => {
  const baseStyles = cn(
    'inline-flex items-center justify-center',
    'font-semibold rounded-xl',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-95', // Press effect
    'shadow-sm hover:shadow-md'
  )

  const variants = {
    primary: cn(
      'bg-gradient-to-r from-primary-600 to-primary-500',
      'text-white',
      'hover:from-primary-700 hover:to-primary-600',
      'focus:ring-primary-500',
      'shadow-primary-500/20'
    ),
    secondary: cn(
      'bg-white border-2 border-gray-200',
      'text-gray-700',
      'hover:bg-gray-50 hover:border-gray-300',
      'focus:ring-gray-500'
    ),
    // ... other variants
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-2.5 text-base min-h-[44px]', // Touch-friendly
    lg: 'px-8 py-3.5 text-lg min-h-[52px]',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

#### Card Component
```typescript
interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  glassMorphism?: boolean
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className,
  padding = 'md',
  hover = false,
  glassMorphism = false
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6', 
    lg: 'p-8',
  }

  return (
    <div
      className={cn(
        glassMorphism 
          ? 'bg-white/70 backdrop-blur-lg border border-white/20'
          : 'bg-white border border-gray-200',
        'rounded-2xl shadow-soft',
        hover && 'transition-all duration-300 hover:shadow-medium hover:-translate-y-1',
        'animate-fade-in',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  )
}
```

#### Input Component
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  className?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl text-base',
            'border-2 border-gray-200',
            'bg-gray-50',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500',
            'focus:border-transparent focus:bg-white',
            'hover:border-gray-300',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'placeholder:text-gray-400',
            'min-h-[44px]', // Touch-friendly
            error ? 'border-danger-500 focus:ring-danger-500' : '',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-danger-600">{error}</p>
        )}
      </div>
    )
  }
)
```

#### Status Badge Component
```typescript
interface StatusBadgeProps {
  status: 'draft' | 'sent' | 'paid'
  className?: string
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const styles = {
    draft: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      dot: 'bg-gray-400',
    },
    sent: {
      bg: 'bg-blue-100', 
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
    paid: {
      bg: 'bg-success-100',
      text: 'text-success-700', 
      dot: 'bg-success-500',
    },
  }

  const style = styles[status]

  return (
    <span className={cn(
      'inline-flex items-center space-x-1.5',
      'px-3 py-1.5 rounded-full text-xs font-semibold',
      style.bg, style.text,
      className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
      <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </span>
  )
}
```

### Layout Components

#### Modern Header
```typescript
const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/invoices', label: 'Invoices', icon: FileText },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo with gradient */}
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-br from-primary-600 to-primary-500 p-2.5 rounded-xl shadow-lg group-hover:shadow-glow transition-all duration-300">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                Invoice Pro
              </span>
              <p className="text-xs text-gray-500">Electrical Services</p>
            </div>
          </Link>

          {/* Desktop Navigation - Modern pill style */}
          <nav className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-2xl p-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive(item.path)
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px]"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200 animate-slide-down">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 mb-1 min-h-[44px]',
                  isActive(item.path)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
```

#### Dashboard Statistics Cards
```typescript
interface StatCardProps {
  label: string
  value: string | number
  change?: number
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  index: number
}

const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  change, 
  icon: Icon, 
  gradient,
  index 
}) => {
  return (
    <Card 
      padding="md" 
      hover
      className="animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {value}
          </p>
          {change !== undefined && (
            <div className={cn(
              "flex items-center space-x-1 text-sm font-medium",
              change > 0 ? "text-success-600" : "text-danger-600"
            )}>
              {change > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-2xl bg-gradient-to-br",
          gradient
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  )
}
```

## Data Models

### Theme Configuration
```typescript
interface ThemeConfig {
  colors: {
    primary: ColorScale
    secondary: ColorScale
    success: ColorScale
    danger: ColorScale
    gray: ColorScale
  }
  spacing: SpacingScale
  typography: TypographyScale
  shadows: ShadowScale
  animations: AnimationConfig
}

interface ColorScale {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
  950: string
}

interface ResponsiveBreakpoints {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
}
```

### Component Props Interfaces
```typescript
interface ModernComponentProps {
  className?: string
  children?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  animate?: boolean
  responsive?: boolean
}

interface TouchFriendlyProps {
  minTouchTarget?: boolean // Ensures 44px minimum
  touchOptimized?: boolean // Adds appropriate padding/spacing
}

interface AccessibilityProps {
  'aria-label'?: string
  'aria-describedby'?: string
  role?: string
  tabIndex?: number
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Now I'll analyze the acceptance criteria to determine which ones are testable as properties:

<function_calls>
<invoke name="prework">
<parameter name="featureName">ui-modernization

Based on the prework analysis, I'll now convert the testable acceptance criteria into correctness properties. After reviewing all properties, I identified several that can be consolidated to eliminate redundancy:

**Property Reflection:**
- Properties 2.3, 3.4, and 9.1 all test the same touch target requirement - these will be combined into one comprehensive property
- Properties about responsive layout (3.2, 3.3, 7.3, 7.4) can be consolidated into layout adaptation properties
- Properties about component styling can be grouped by component type for better organization

### Correctness Properties

Property 1: Color System Completeness
*For any* design system configuration, all required color palettes (primary electric blue with 50-950 shades, secondary amber, success green, danger red, and neutral gray slate) should be present with correct hex values
**Validates: Requirements 1.1, 1.2, 1.3**

Property 2: Design Token Availability  
*For any* design system configuration, all required design tokens (gradient backgrounds, shadow variations, typography scales, spacing scales) should be available and properly configured
**Validates: Requirements 1.4, 1.5, 2.1, 2.4**

Property 3: Touch Target Accessibility
*For any* interactive element (buttons, links, form inputs, navigation items), the minimum touch target size should be 44x44px or larger
**Validates: Requirements 2.3, 3.4, 9.1**

Property 4: Responsive Typography Scaling
*For any* heading element, the responsive classes should scale appropriately across breakpoints (h1: text-3xl sm:text-4xl lg:text-5xl)
**Validates: Requirements 2.2**

Property 5: Font Loading Configuration
*For any* typography configuration, the Inter font family should be properly loaded and applied as the primary font
**Validates: Requirements 2.5**

Property 6: Breakpoint Configuration
*For any* responsive configuration, the mobile-first breakpoints should be correctly defined (xs: 475px, sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px)
**Validates: Requirements 3.1**

Property 7: Responsive Layout Adaptation
*For any* layout component, elements should stack vertically on mobile breakpoints and use horizontal layouts on tablet/desktop breakpoints
**Validates: Requirements 3.2, 3.3**

Property 8: Responsive Spacing Scaling
*For any* component with responsive spacing, padding and margins should scale appropriately across different screen sizes
**Validates: Requirements 3.5**

Property 9: Button Component Styling
*For any* button component, it should implement gradient backgrounds, proper size variations (sm, md, lg), and include hover/active state styles
**Validates: Requirements 4.1, 4.2**

Property 10: Card Component Features
*For any* card component, it should feature rounded corners (rounded-2xl), modern shadows (shadow-soft), and optional hover lift effects
**Validates: Requirements 4.3**

Property 11: Input Component Focus States
*For any* input component, it should implement focus states with ring effects (focus:ring-2 focus:ring-primary-500) and smooth transitions
**Validates: Requirements 4.4**

Property 12: Status Badge Rendering
*For any* status badge component, it should display the status with colored dots and appropriate background colors based on the status value
**Validates: Requirements 4.5**

Property 13: Header Glass Morphism
*For any* header component, it should implement glass morphism effects with backdrop blur (backdrop-blur-lg) and appropriate transparency
**Validates: Requirements 5.1**

Property 14: Navigation Responsive Behavior
*For any* navigation component, it should display as pill-style tabs on desktop breakpoints and as a hamburger menu with slide-down animation on mobile
**Validates: Requirements 5.2, 5.3**

Property 15: Navigation Active State
*For any* navigation system, active pages should be highlighted with appropriate visual feedback (different background, text color, or shadow)
**Validates: Requirements 5.4**

Property 16: Logo Interactive Effects
*For any* logo component, it should include gradient effects and hover animations (hover:shadow-glow transition-all duration-300)
**Validates: Requirements 5.5**

Property 17: Dashboard Card Interactions
*For any* dashboard card, it should implement modern card design with hover lift effects and display statistics with appropriate icons and gradient backgrounds
**Validates: Requirements 6.1, 6.2**

Property 18: Dashboard Trend Indicators
*For any* dashboard card with trend data, it should display trend indicators with colored arrows (TrendingUp/TrendingDown) and percentage values
**Validates: Requirements 6.3**

Property 19: Dashboard Animation Timing
*For any* dashboard card grid, cards should animate on page load with staggered entrance effects using incremental animation delays
**Validates: Requirements 6.4**

Property 20: Dashboard Grid Responsiveness
*For any* dashboard grid, it should be responsive across all device sizes using appropriate grid column counts (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4)
**Validates: Requirements 6.5**

Property 21: Form Layout Responsiveness
*For any* form component, it should implement grouped sections with background differentiation and adapt layout from vertical stacking on mobile to grid layouts on larger screens
**Validates: Requirements 7.1, 7.3**

Property 22: Form Input States
*For any* form input, it should provide clear focus states and validation feedback with appropriate error styling
**Validates: Requirements 7.2**

Property 23: Form Action Responsiveness
*For any* form action buttons, they should be full-width on mobile breakpoints and inline on desktop breakpoints
**Validates: Requirements 7.4**

Property 24: Form Micro-Interactions
*For any* form component, it should include smooth transitions (transition-all duration-200) and micro-interactions
**Validates: Requirements 7.5**

Property 25: Animation System Implementation
*For any* page component, it should implement fade-in effects (animate-fade-in) for page transitions and provide hover effects for interactive elements
**Validates: Requirements 8.1, 8.2**

Property 26: Loading State Animations
*For any* loading component, it should include shimmer effects (animate-shimmer) and smooth transitions for state changes
**Validates: Requirements 8.3, 8.4**

Property 27: Mobile Layout Optimization
*For any* mobile layout, it should provide appropriate spacing and padding optimized for thumb navigation
**Validates: Requirements 9.2**

Property 28: Mobile Form Optimization
*For any* mobile form input, it should be optimized for mobile keyboards with appropriate input attributes (inputMode, autoComplete)
**Validates: Requirements 9.3**

Property 29: Color Contrast Compliance
*For any* text element, the color combination with its background should maintain WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
**Validates: Requirements 10.1**

Property 30: Keyboard Navigation Support
*For any* focusable element, it should provide visible focus indicators and appropriate ARIA labels for keyboard navigation
**Validates: Requirements 10.2, 10.3**

Property 31: Image Optimization
*For any* image element, it should implement lazy loading attributes (loading="lazy") and use appropriate formats for performance
**Validates: Requirements 10.4**

## Error Handling

### Design System Configuration Errors
- **Missing Color Tokens**: If required color tokens are missing, the system should fall back to default values and log warnings
- **Invalid Breakpoint Values**: If breakpoint values are invalid, the system should use default responsive breakpoints
- **Font Loading Failures**: If the Inter font fails to load, the system should fall back to system fonts

### Component Rendering Errors
- **Missing Props**: Components should handle missing required props gracefully with default values
- **Invalid Variant Values**: If invalid variant props are passed, components should fall back to default variants
- **Animation Failures**: If animations fail to load, components should still render without animations

### Responsive Layout Errors
- **Breakpoint Detection Issues**: If breakpoint detection fails, the system should assume mobile-first layout
- **Grid Layout Failures**: If CSS Grid is not supported, the system should fall back to flexbox layouts
- **Touch Target Violations**: If elements don't meet touch target requirements, the system should log accessibility warnings

### Accessibility Errors
- **Contrast Ratio Violations**: The system should detect and warn about color combinations that don't meet WCAG standards
- **Missing ARIA Labels**: Components should provide default ARIA labels if none are specified
- **Focus Management Issues**: If focus management fails, the system should ensure keyboard navigation still works

## Testing Strategy

### Dual Testing Approach

The UI modernization will use both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Component rendering with specific props
- Responsive behavior at exact breakpoint values
- Error handling for invalid inputs
- Integration between components

**Property Tests**: Verify universal properties across all inputs
- Color contrast ratios across all color combinations
- Touch target sizes across all interactive elements
- Responsive behavior across all breakpoint ranges
- Component styling consistency across all variants

### Property-Based Testing Configuration

**Testing Framework**: We'll use `@fast-check/jest` for property-based testing in the React/TypeScript environment.

**Test Configuration**:
- Minimum 100 iterations per property test
- Each property test references its design document property
- Tag format: **Feature: ui-modernization, Property {number}: {property_text}**

**Example Property Test Structure**:
```typescript
describe('UI Modernization Properties', () => {
  it('should maintain touch target accessibility', () => {
    fc.assert(fc.property(
      fc.record({
        variant: fc.constantFrom('primary', 'secondary', 'success', 'danger'),
        size: fc.constantFrom('sm', 'md', 'lg'),
        disabled: fc.boolean()
      }),
      (props) => {
        const button = render(<Button {...props}>Test</Button>)
        const element = button.getByRole('button')
        const computedStyle = window.getComputedStyle(element)
        const minHeight = parseInt(computedStyle.minHeight)
        const minWidth = parseInt(computedStyle.minWidth)
        
        // Feature: ui-modernization, Property 3: Touch Target Accessibility
        expect(minHeight).toBeGreaterThanOrEqual(44)
        expect(minWidth).toBeGreaterThanOrEqual(44)
      }
    ), { numRuns: 100 })
  })
  
  it('should maintain color contrast ratios', () => {
    fc.assert(fc.property(
      fc.record({
        textColor: fc.constantFrom('text-gray-900', 'text-white', 'text-primary-600'),
        backgroundColor: fc.constantFrom('bg-white', 'bg-primary-500', 'bg-gray-100')
      }),
      (props) => {
        const contrastRatio = calculateContrastRatio(props.textColor, props.backgroundColor)
        
        // Feature: ui-modernization, Property 29: Color Contrast Compliance
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5)
      }
    ), { numRuns: 100 })
  })
})
```

### Unit Testing Focus Areas

**Component Behavior**:
- Button variants render with correct classes
- Card hover effects are applied correctly
- Input focus states work as expected
- Status badges display correct colors

**Responsive Behavior**:
- Navigation switches between desktop and mobile modes
- Form layouts adapt at breakpoints
- Dashboard grids use correct column counts
- Typography scales appropriately

**Accessibility**:
- ARIA labels are present where required
- Focus indicators are visible
- Semantic HTML is used correctly
- Keyboard navigation works properly

**Integration Points**:
- Theme configuration is applied correctly
- Components work together in layouts
- Animation timing doesn't conflict
- Error boundaries handle component failures

Both testing approaches are essential for ensuring the UI modernization meets all requirements while maintaining reliability and accessibility across all user scenarios.