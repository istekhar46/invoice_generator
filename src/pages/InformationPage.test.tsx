import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { isValidElement } from 'react'
import { MemoryRouter, type RouteObject } from 'react-router-dom'
import { InformationPage } from './InformationPage'
import { Footer } from '../components/layout/Footer'
import { router } from '../routes'

describe('Footer information pages', () => {
  it.each(['about', 'help'] as const)('links to a public, readable %s page', (page) => {
    const route = router.routes[0].children?.find((entry) => entry.path === page)
    const element = (route as RouteObject | undefined)?.element
    expect(isValidElement(element) && element.type).toBe(InformationPage)
    render(
      <MemoryRouter>
        <InformationPage page={page} />
        <Footer />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Footer' })).toBeVisible()
    expect(screen.getByRole('link', { name: page === 'about' ? 'About' : 'Help' }))
      .toHaveAttribute('href', `/${page}`)
  })
})
