# Modern Typography System

## Overview

The modern typography system implements responsive, accessible, and visually appealing text styles across the application. It follows a mobile-first approach with fluid scaling from 14px base on mobile to 16px on desktop.

## Key Features

- ✅ **Responsive Scaling**: Fluid typography that adapts from mobile to desktop
- ✅ **Inter Font Family**: Modern, professional font with proper fallbacks
- ✅ **Touch-Friendly**: Minimum 44px touch targets for interactive elements
- ✅ **Consistent Line Heights**: Optimized for readability across all text types
- ✅ **Accessibility**: WCAG-compliant contrast ratios and semantic HTML
- ✅ **Performance**: Optimized font loading with display=swap

## Font Loading

### Primary Font
- **Font Family**: Inter (Variable font with weights 100-900)
- **Loading Strategy**: Google Fonts with preconnect and display=swap
- **Fallback Stack**: Inter Fallback → ui-sans-serif → system-ui → sans-serif

### Font Display Optimization
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
```

## Responsive Base Font Size

The typography system uses a responsive base font size that scales with screen size:

```css
html {
  font-size: 14px; /* Mobile (< 640px) */
}

@media (min-width: 640px) {
  html { font-size: 15px; } /* Tablet */
}

@media (min-width: 1024px) {
  html { font-size: 16px; } /* Desktop */
}
```

## Typography Scale

### Font Sizes
| Token | Size | Usage |
|-------|------|-------|
| `xs` | 0.75rem (12px) | Captions, labels |
| `sm` | 0.875rem (14px) | Small text, metadata |
| `base` | 1rem (16px) | Body text |
| `lg` | 1.125rem (18px) | Large body text |
| `xl` | 1.25rem (20px) | Small headings |
| `2xl` | 1.5rem (24px) | Medium headings |
| `3xl` | 1.875rem (30px) | Large headings |
| `4xl` | 2.25rem (36px) | Extra large headings |
| `5xl` | 3rem (48px) | Display text |
| `6xl` | 3.75rem (60px) | Large display |
| `7xl` | 4.5rem (72px) | Extra large display |
| `8xl` | 6rem (96px) | Huge display |
| `9xl` | 8rem (128px) | Massive display |

### Line Heights
| Token | Value | Usage |
|-------|-------|-------|
| `none` | 1 | Display text |
| `tight` | 1.25 | Headings |
| `snug` | 1.375 | Subheadings |
| `normal` | 1.5 | Default |
| `relaxed` | 1.625 | Body text |
| `loose` | 2 | Spacious text |

### Font Weights
| Token | Value | Usage |
|-------|-------|-------|
| `thin` | 100 | Decorative |
| `extralight` | 200 | Light emphasis |
| `light` | 300 | Subtle text |
| `normal` | 400 | Body text |
| `medium` | 500 | Emphasis |
| `semibold` | 600 | Strong emphasis |
| `bold` | 700 | Headings |
| `extrabold` | 800 | Strong headings |
| `black` | 900 | Display text |

## Typography Components

### Using the Typography Component

```tsx
import { Typography, Heading1, BodyText, Caption } from '@/components/ui'

// Basic usage
<Typography variant="heading-1">Main Title</Typography>

// With custom element
<Typography variant="body" as="span">Inline text</Typography>

// With touch target
<Typography variant="body" touchTarget>Interactive text</Typography>

// With text utilities
<Typography variant="heading-2" balance>Balanced headline</Typography>
<Typography variant="body" pretty>Pretty paragraph</Typography>
```

### Convenience Components

```tsx
// Display typography
<DisplayXL>Hero Title</DisplayXL>
<DisplayLarge>Large Display</DisplayLarge>

// Headings (responsive by default)
<Heading1>Main Title</Heading1>        // text-3xl → sm:text-4xl → lg:text-5xl
<Heading2>Section Title</Heading2>     // text-2xl → sm:text-3xl → lg:text-4xl
<Heading3>Subsection</Heading3>        // text-xl → sm:text-2xl → lg:text-3xl
<Heading4>Minor Heading</Heading4>     // text-lg → sm:text-xl → lg:text-2xl
<Heading5>Small Heading</Heading5>     // text-base → sm:text-lg → lg:text-xl
<Heading6>Tiny Heading</Heading6>      // text-sm → sm:text-base

// Body text
<BodyLarge>Large paragraph text</BodyLarge>
<BodyText>Regular paragraph text</BodyText>
<BodySmall>Small paragraph text</BodySmall>

// Utility text
<Caption>Caption or help text</Caption>
<Link href="#">Interactive link</Link>
```

## Responsive Heading Styles

All heading components automatically apply responsive classes:

```tsx
// Heading 1 automatically applies:
className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight"

// Heading 2 automatically applies:
className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight tracking-tight"

// And so on for all heading levels...
```

## Custom CSS Classes

### Heading Classes
```css
.heading-1 { /* Responsive h1 styles */ }
.heading-2 { /* Responsive h2 styles */ }
.heading-3 { /* Responsive h3 styles */ }
.heading-4 { /* Responsive h4 styles */ }
.heading-5 { /* Responsive h5 styles */ }
.heading-6 { /* Responsive h6 styles */ }
```

### Body Text Classes
```css
.text-body-lg { /* Large body text */ }
.text-body { /* Regular body text */ }
.text-body-sm { /* Small body text */ }
.text-caption { /* Caption text */ }
```

### Display Classes
```css
.text-display-2xl { /* Massive display text */ }
.text-display-xl { /* Extra large display */ }
.text-display-lg { /* Large display */ }
```

### Interactive Classes
```css
.text-link { /* Link styles with hover/focus */ }
```

## Touch Target Accessibility

All interactive text elements should meet the minimum 44x44px touch target requirement:

```tsx
// Automatic touch target
<Typography variant="body" touchTarget>
  Interactive element
</Typography>

// Using utility function
import { getTouchTargetClass } from '@/styles/typography'

<button className={getTouchTargetClass('minimum')}>
  Button with 44px minimum
</button>
```

## Text Utilities

### Text Balance
Improves headline layout by balancing line lengths:

```tsx
<Heading1 balance>
  This headline will have balanced line lengths
</Heading1>
```

### Text Pretty
Prevents orphans and improves paragraph layout:

```tsx
<BodyText pretty>
  This paragraph will avoid orphans and improve layout
</BodyText>
```

## TypeScript Support

Full TypeScript support with type-safe variants:

```typescript
import type { 
  TypographyVariant,
  FontWeight,
  LineHeight,
  LetterSpacing 
} from '@/styles/typography'

// Type-safe variant
const variant: TypographyVariant = 'heading-1'

// Type-safe font weight
const weight: FontWeight = 'semibold'
```

## Best Practices

### 1. Use Semantic HTML
```tsx
// ✅ Good - semantic HTML
<Heading1>Page Title</Heading1>
<BodyText>Paragraph content</BodyText>

// ❌ Bad - non-semantic
<div className="text-3xl font-bold">Page Title</div>
```

### 2. Maintain Hierarchy
```tsx
// ✅ Good - proper hierarchy
<Heading1>Main Title</Heading1>
<Heading2>Section</Heading2>
<Heading3>Subsection</Heading3>

// ❌ Bad - skipping levels
<Heading1>Main Title</Heading1>
<Heading3>Section</Heading3>
```

### 3. Use Responsive Components
```tsx
// ✅ Good - responsive by default
<Heading1>Responsive Title</Heading1>

// ❌ Bad - fixed size
<h1 className="text-5xl">Fixed Title</h1>
```

### 4. Ensure Touch Targets
```tsx
// ✅ Good - touch-friendly
<Typography variant="body" touchTarget>
  Interactive text
</Typography>

// ❌ Bad - too small
<span className="text-xs">Tiny interactive text</span>
```

### 5. Use Text Utilities Appropriately
```tsx
// ✅ Good - balance for headlines
<Heading2 balance>Long Headline Text</Heading2>

// ✅ Good - pretty for paragraphs
<BodyText pretty>Long paragraph content...</BodyText>

// ❌ Bad - balance on body text
<BodyText balance>Paragraph content</BodyText>
```

## Performance Considerations

### Font Loading
- Uses `display=swap` to prevent FOIT (Flash of Invisible Text)
- Preconnects to Google Fonts for faster loading
- Provides fallback fonts with similar metrics

### Font Subsetting
Consider subsetting the Inter font for production:
```
?family=Inter:wght@400;500;600;700&display=swap&subset=latin
```

### Variable Fonts
Inter is loaded as a variable font, providing all weights in a single file for better performance.

## Accessibility

### Color Contrast
All text colors maintain WCAG 2.1 AA contrast ratios:
- Normal text: 4.5:1 minimum
- Large text (18px+): 3:1 minimum

### Focus Indicators
Interactive text elements include visible focus indicators:
```css
.text-link:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
  border-radius: 2px;
}
```

### Screen Readers
Use semantic HTML elements for proper screen reader support:
- `<h1>` through `<h6>` for headings
- `<p>` for paragraphs
- `<a>` for links

## Testing

Run typography tests:
```bash
npm test src/components/ui/Typography.test.tsx
```

View typography demo:
```tsx
import TypographyDemo from '@/pages/TypographyDemo'
```

## Requirements Validation

This typography system validates the following requirements:

- ✅ **2.1**: Fluid scaling from 14px (mobile) to 16px (desktop)
- ✅ **2.2**: Responsive heading sizing (h1: text-3xl/4xl/5xl)
- ✅ **2.3**: Minimum 44px touch targets for interactive elements
- ✅ **2.4**: Consistent line heights for optimal readability
- ✅ **2.5**: Inter font family with proper loading and fallbacks