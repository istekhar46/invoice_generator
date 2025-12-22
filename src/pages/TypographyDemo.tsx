import React from 'react'
import { 
  Typography,
  Heading1, 
  Heading2, 
  Heading3, 
  Heading4, 
  Heading5, 
  Heading6,
  BodyText, 
  BodyLarge, 
  BodySmall, 
  Caption,
  Link,
  DisplayXL,
  DisplayLarge,
  StatusBadge
} from '../components/ui'
import { Card, CardContent } from '../components/ui'

/**
 * Typography Demo Page
 * Showcases the modern typography system with responsive scaling
 */
export const TypographyDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <Card className="text-center">
          <CardContent className="p-8">
            <DisplayXL className="mb-4 bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
              Modern Typography System
            </DisplayXL>
            <BodyLarge className="text-gray-600">
              Responsive typography with fluid scaling, proper line heights, and touch targets
            </BodyLarge>
          </CardContent>
        </Card>

        {/* Display Typography */}
        <Card>
          <CardContent className="p-8">
            <Heading2 className="mb-6 text-gray-900">Display Typography</Heading2>
            <div className="space-y-6">
              <div>
                <Caption className="mb-2">Display XL</Caption>
                <DisplayXL>The quick brown fox</DisplayXL>
              </div>
              <div>
                <Caption className="mb-2">Display Large</Caption>
                <DisplayLarge>The quick brown fox</DisplayLarge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Headings */}
        <Card>
          <CardContent className="p-8">
            <Heading2 className="mb-6 text-gray-900">Responsive Headings</Heading2>
            <div className="space-y-4">
              <div>
                <Caption className="mb-2">Heading 1 - Responsive: text-3xl → sm:text-4xl → lg:text-5xl</Caption>
                <Heading1>The quick brown fox jumps over the lazy dog</Heading1>
              </div>
              <div>
                <Caption className="mb-2">Heading 2 - Responsive: text-2xl → sm:text-3xl → lg:text-4xl</Caption>
                <Heading2>The quick brown fox jumps over the lazy dog</Heading2>
              </div>
              <div>
                <Caption className="mb-2">Heading 3 - Responsive: text-xl → sm:text-2xl → lg:text-3xl</Caption>
                <Heading3>The quick brown fox jumps over the lazy dog</Heading3>
              </div>
              <div>
                <Caption className="mb-2">Heading 4 - Responsive: text-lg → sm:text-xl → lg:text-2xl</Caption>
                <Heading4>The quick brown fox jumps over the lazy dog</Heading4>
              </div>
              <div>
                <Caption className="mb-2">Heading 5 - Responsive: text-base → sm:text-lg → lg:text-xl</Caption>
                <Heading5>The quick brown fox jumps over the lazy dog</Heading5>
              </div>
              <div>
                <Caption className="mb-2">Heading 6 - Responsive: text-sm → sm:text-base</Caption>
                <Heading6>The quick brown fox jumps over the lazy dog</Heading6>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Body Text */}
        <Card>
          <CardContent className="p-8">
            <Heading2 className="mb-6 text-gray-900">Body Typography</Heading2>
            <div className="space-y-6">
              <div>
                <Caption className="mb-2">Body Large</Caption>
                <BodyLarge>
                  This is large body text with relaxed line height for improved readability. 
                  It's perfect for introductory paragraphs or important content that needs emphasis.
                </BodyLarge>
              </div>
              <div>
                <Caption className="mb-2">Body Regular</Caption>
                <BodyText>
                  This is regular body text with optimal line height for comfortable reading. 
                  It scales responsively from 14px on mobile to 16px on desktop, ensuring 
                  readability across all devices.
                </BodyText>
              </div>
              <div>
                <Caption className="mb-2">Body Small</Caption>
                <BodySmall>
                  This is small body text used for secondary information, captions, or 
                  supplementary content that doesn't need as much visual prominence.
                </BodySmall>
              </div>
              <div>
                <Caption className="mb-2">Caption</Caption>
                <Caption>
                  This is caption text used for image captions, form help text, or other 
                  small supplementary information.
                </Caption>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Elements */}
        <Card>
          <CardContent className="p-8">
            <Heading2 className="mb-6 text-gray-900">Interactive Typography</Heading2>
            <div className="space-y-4">
              <div>
                <Caption className="mb-2">Links with hover effects</Caption>
                <BodyText>
                  This paragraph contains a <Link as="a" className="inline">sample link</Link> that 
                  demonstrates the hover and focus states with proper accessibility support.
                </BodyText>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Badges */}
        <Card>
          <CardContent className="p-8">
            <Heading2 className="mb-6 text-gray-900">Status Badge Component</Heading2>
            <div className="space-y-4">
              <div>
                <Caption className="mb-2">Status badges with colored dots and backgrounds</Caption>
                <div className="flex flex-wrap gap-4">
                  <StatusBadge status="draft" />
                  <StatusBadge status="sent" />
                  <StatusBadge status="paid" />
                </div>
              </div>
              <div>
                <Caption className="mb-2">Status badges in context</Caption>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <BodyText>Invoice #001</BodyText>
                    <StatusBadge status="draft" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <BodyText>Invoice #002</BodyText>
                    <StatusBadge status="sent" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <BodyText>Invoice #003</BodyText>
                    <StatusBadge status="paid" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Touch Targets */}
        <Card>
          <CardContent className="p-8">
            <Heading2 className="mb-6 text-gray-900">Touch Target Accessibility</Heading2>
            <div className="space-y-4">
              <div>
                <Caption className="mb-2">Minimum 44px touch targets</Caption>
                <div className="flex flex-wrap gap-4">
                  <Typography variant="body" touchTarget className="bg-primary-100 rounded-lg px-4 py-2 cursor-pointer">
                    Touch Target 1
                  </Typography>
                  <Typography variant="body" touchTarget className="bg-secondary-100 rounded-lg px-4 py-2 cursor-pointer">
                    Touch Target 2
                  </Typography>
                  <Typography variant="body" touchTarget className="bg-success-100 rounded-lg px-4 py-2 cursor-pointer">
                    Touch Target 3
                  </Typography>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Text Utilities */}
        <Card>
          <CardContent className="p-8">
            <Heading2 className="mb-6 text-gray-900">Text Utilities</Heading2>
            <div className="space-y-6">
              <div>
                <Caption className="mb-2">Text Balance (for headlines)</Caption>
                <Heading3 balance className="max-w-md">
                  This headline uses text-wrap: balance for better visual hierarchy and readability
                </Heading3>
              </div>
              <div>
                <Caption className="mb-2">Text Pretty (for paragraphs)</Caption>
                <BodyText pretty className="max-w-md">
                  This paragraph uses text-wrap: pretty to avoid orphans and improve the overall 
                  text layout for better reading experience.
                </BodyText>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Font Loading Info */}
        <Card>
          <CardContent className="p-8">
            <Heading2 className="mb-6 text-gray-900">Font Loading</Heading2>
            <div className="space-y-4">
              <BodyText>
                <strong>Primary Font:</strong> Inter (loaded from Google Fonts with display=swap)
              </BodyText>
              <BodyText>
                <strong>Fallback Stack:</strong> Inter Fallback → ui-sans-serif → system-ui → sans-serif
              </BodyText>
              <BodyText>
                <strong>Font Features:</strong> Optimized for readability with proper font smoothing and text rendering
              </BodyText>
              <BodyText>
                <strong>Responsive Base:</strong> 14px (mobile) → 15px (tablet) → 16px (desktop)
              </BodyText>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TypographyDemo