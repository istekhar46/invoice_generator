import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MainLayout } from './MainLayout'

const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  user: {
    id: 'test-owner',
    displayName: 'Alex Taylor',
    email: 'alex@example.com',
  } as { id: string; displayName: string; email: string } | null,
}))
const logout = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('../../hooks/useAuth', () => ({
  useAuthStatus: () => auth,
  useLogout: () => ({ mutateAsync: logout, isPending: false }),
}))
vi.mock('../seo/SiteMetadata', () => ({ SiteMetadata: () => null }))
vi.mock('./Breadcrumbs', () => ({
  Breadcrumbs: () => <nav aria-label="Breadcrumb" />,
}))

function Page() {
  return <input aria-label="Invoice description" defaultValue="Unsaved work" />
}
function renderLayout() {
  const router = createMemoryRouter(
    [{ element: <MainLayout />, children: [{ path: '*', element: <Page /> }] }],
    { initialEntries: ['/invoices?status=draft'] }
  )
  return { ...render(<RouterProvider router={router} />), router }
}

beforeEach(() => {
  auth.isAuthenticated = true
  auth.user = {
    id: 'test-owner',
    displayName: 'Alex Taylor',
    email: 'alex@example.com',
  }
  vi.clearAllMocks()
})

describe('Console navigation', () => {
  it('exposes implemented destinations and highlights the current route with query parameters', () => {
    renderLayout()
    const sidebar = screen.getByRole('complementary', {
      name: 'Console sidebar',
    })
    const nav = within(sidebar).getByRole('navigation', { name: 'Workspace' })
    expect(within(nav).getByRole('link', { name: 'Invoices' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    for (const name of [
      'Dashboard',
      'Quick Invoice',
      'Products & Services',
      'Customers',
      'Company Profile',
    ]) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(
      within(sidebar).getByRole('link', { name: 'Create Invoice' })
    ).toHaveAttribute('href', '/invoices?create=true')
    expect(
      within(sidebar).queryByText(
        /Purchases|Expenses|Subscriptions|Inventory|Quotations/
      )
    ).not.toBeInTheDocument()
  })

  it('opens an accessible drawer, traps focus and restores the trigger on Escape', async () => {
    const user = userEvent.setup()
    renderLayout()
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    const dialog = screen.getByRole('dialog', { name: 'Your workspace' })
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'Close menu' })
      ).toHaveFocus()
    )
    for (let i = 0; i < 12; i++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(toggle).toHaveFocus()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes after selecting a destination', async () => {
    const user = userEvent.setup()
    renderLayout()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    const dialog = screen.getByRole('dialog')
    await user.click(
      within(dialog).getByRole('link', { name: 'Products & Services' })
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const sidebar = screen.getByRole('complementary', {
      name: 'Console sidebar',
    })
    expect(
      within(sidebar).getByRole('link', { name: 'Products & Services' })
    ).toHaveAttribute('aria-current', 'page')
  })

  it('closes on query-only navigation and stays closed on back without remounting page edits', async () => {
    const user = userEvent.setup()
    const { router } = renderLayout()
    const description = screen.getByRole('textbox', {
      name: 'Invoice description',
    })
    await user.clear(description)
    await user.type(description, 'Changed locally without saving')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await act(async () => {
      await router.navigate('/invoices?status=sent')
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await act(async () => {
      await router.navigate(-1)
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Invoice description' })
    ).toHaveValue('Changed locally without saving')
  })

  it('omits console navigation and breadcrumbs when signed out', () => {
    auth.isAuthenticated = false
    auth.user = null
    renderLayout()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Open menu' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Breadcrumb' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('drops an open drawer on logout and does not reopen it for a different account', async () => {
    const user = userEvent.setup()
    const { router } = renderLayout()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    auth.isAuthenticated = false
    auth.user = null
    await act(async () => {
      await router.navigate('/login')
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Open menu' })
    ).not.toBeInTheDocument()

    auth.isAuthenticated = true
    auth.user = {
      id: 'different-owner',
      displayName: 'Another Owner',
      email: 'another@example.com',
    }
    await act(async () => {
      await router.navigate('/dashboard')
    })
    expect(
      screen.getByRole('complementary', { name: 'Console sidebar' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })
})
