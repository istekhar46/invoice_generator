import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteMetadata } from './SiteMetadata'

describe('Route metadata', () => {
  it('replaces homepage metadata when navigating to help or an error page', () => {
    const { rerender } = render(<SiteMetadata pathname="/" />)
    expect(document.title).toContain('Free Invoice Generator')
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.invoiceo.site/')
    rerender(<SiteMetadata pathname="/help" />)
    expect(document.title).toContain('Invoice Help')
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.invoiceo.site/help')
    rerender(<SiteMetadata pathname="/does-not-exist" />)
    expect(document.title).toBe('Page not found | Invoiceo')
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelector('meta[name="description"]')).toBeNull()
  })

  it('canonicalizes a trailing slash on a public route', () => {
    render(<SiteMetadata pathname="/about/" />)
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.invoiceo.site/about')
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
  })

  it.each(['/login', '/signup', '/dashboard', '/auth/callback'])('does not index %s', (pathname) => {
    const html = renderToStaticMarkup(<SiteMetadata pathname={pathname} />)
    expect(html).toContain('noindex, follow')
    expect(html).not.toContain('rel="canonical"')
    expect(html).not.toContain('application/ld+json')
  })

  it('produces crawlable metadata and factual schema for initial HTML', () => {
    const html = renderToStaticMarkup(<SiteMetadata pathname="/" />)
    expect(html).toContain('name="description"')
    expect(html).toContain('property="og:image"')
    expect(html).toContain('name="twitter:card"')
    expect(html).toContain('WebApplication')
    expect(html).not.toContain('aggregateRating')
    expect(html).not.toContain('Organization')
  })
})
