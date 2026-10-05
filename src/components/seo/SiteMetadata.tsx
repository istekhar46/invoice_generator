import * as React from 'react'

const origin = 'https://www.invoiceo.site'

const publicPageMetadata = {
  '/': {
    title: 'Free Invoice Generator – Create PDF Invoices | Invoiceo',
    description: 'Create a professional PDF invoice with Invoiceo. Enter your business and customer details, add line items, and download your invoice without signing up.',
  },
  '/about': {
    title: 'About Invoiceo | Online PDF Invoice Generator',
    description: 'Learn how Invoiceo helps you create PDF invoices, organize customer details, and manage business billing with guest and account workflows.',
  },
  '/help': {
    title: 'Invoice Help | Create and Download PDF Invoices | Invoiceo',
    description: 'Learn how to create an invoice without signing up, set up your account, review tax and totals, and download a PDF with Invoiceo.',
  },
} as const

const accountPageTitles: Record<string, string> = {
  '/login': 'Sign in',
  '/signup': 'Create your account',
  '/dashboard': 'Dashboard',
  '/invoices': 'Invoices',
  '/customers': 'Customers',
  '/company': 'Company profile',
  '/quick-invoice': 'Quick invoice',
  '/auth/callback': 'Completing sign-in',
}

export function SiteMetadata({ pathname }: { pathname: string }) {
  const path = pathname.replace(/\/+$/, '') || '/'
  const page = publicPageMetadata[path as keyof typeof publicPageMetadata]
  const title = page?.title ?? `${accountPageTitles[path] ?? 'Page not found'} | Invoiceo`
  const canonical = page ? `${origin}${path === '/' ? '/' : path}` : undefined
  const image = `${origin}/invoiceo-preview.png`

  return (
    <React.Fragment>
      <title data-invoiceo-seo="">{title}</title>
      <meta data-invoiceo-seo="" name="robots" content={page ? 'index, follow' : 'noindex, follow'} />
      {page && (
        <>
          <meta data-invoiceo-seo="" name="description" content={page.description} />
          <link data-invoiceo-seo="" rel="canonical" href={canonical} />
          <meta data-invoiceo-seo="" property="og:type" content="website" />
          <meta data-invoiceo-seo="" property="og:site_name" content="Invoiceo" />
          <meta data-invoiceo-seo="" property="og:title" content={title} />
          <meta data-invoiceo-seo="" property="og:description" content={page.description} />
          <meta data-invoiceo-seo="" property="og:url" content={canonical} />
          <meta data-invoiceo-seo="" property="og:image" content={image} />
          <meta data-invoiceo-seo="" property="og:image:alt" content="Invoiceo invoice preview" />
          <meta data-invoiceo-seo="" name="twitter:card" content="summary_large_image" />
          <meta data-invoiceo-seo="" name="twitter:title" content={title} />
          <meta data-invoiceo-seo="" name="twitter:description" content={page.description} />
          <meta data-invoiceo-seo="" name="twitter:image" content={image} />
          {path === '/' && (
            <script data-invoiceo-seo="" type="application/ld+json">
              {JSON.stringify({
                '@context': 'https://schema.org',
                '@graph': [
                  { '@type': 'WebSite', '@id': `${origin}/#website`, name: 'Invoiceo', url: `${origin}/` },
                  {
                    '@type': 'WebApplication', '@id': `${origin}/#application`,
                    name: 'Invoiceo', url: `${origin}/`, applicationCategory: 'BusinessApplication',
                    operatingSystem: 'Web browser', description: page.description,
                  },
                ],
              })}
            </script>
          )}
        </>
      )}
    </React.Fragment>
  )
}
