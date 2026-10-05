import { createBrowserRouter } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import { NavigationProvider } from '../components/providers/NavigationProvider'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import { CompanySetupGuard } from '../components/guards/CompanySetupGuard'

// Page components
import {
  HomePage,
  LoginPage,
  SignupPage,
  DashboardPage,
  CustomersPage,
  InvoicesPage,
  QuickInvoicePage,
  CompanyProfilePage,
  NotFoundPage,
} from '../pages'
import { InformationPage } from '../pages/InformationPage'
import { GoogleAuthCallbackPage } from '../pages/GoogleAuthCallbackPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <NavigationProvider>
        <MainLayout />
      </NavigationProvider>
    ),
    children: [
      // Root route - Homepage for unauthenticated users, redirect to dashboard for authenticated
      {
        index: true,
        element: (
          <PublicRoute>
            <HomePage />
          </PublicRoute>
        ),
      },
      
      // Public routes (only accessible when NOT authenticated)
      {
        path: 'login',
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        ),
      },
      {
        path: 'signup',
        element: (
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        ),
      },
      
      // Protected routes (only accessible when authenticated)
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customers',
        element: (
          <ProtectedRoute>
            <CompanySetupGuard>
              <CustomersPage />
            </CompanySetupGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'invoices',
        element: (
          <ProtectedRoute>
            <CompanySetupGuard>
              <InvoicesPage />
            </CompanySetupGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'quick-invoice',
        element: (
          <ProtectedRoute>
            <QuickInvoicePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'company',
        element: (
          <ProtectedRoute>
            <CompanyProfilePage />
          </ProtectedRoute>
        ),
      },
      // Settings route is temporarily disabled. SettingsPage remains available in
      // src/pages/SettingsPage.tsx and can be restored here when it is ready.
      
      // OAuth callback route — must NOT be wrapped in PublicRoute or ProtectedRoute
      // because the access token hasn't been stored in memory yet on first load
      {
        path: 'auth/callback',
        element: <GoogleAuthCallbackPage />,
      },

      { path: 'about', element: <InformationPage page="about" /> },
      { path: 'help', element: <InformationPage page="help" /> },

      // 404 page
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])

// Route metadata for breadcrumbs and navigation
export const routeMetadata = {
  '/': {
    title: 'Home',
    breadcrumb: 'Home',
  },
  '/dashboard': {
    title: 'Dashboard',
    breadcrumb: 'Dashboard',
  },
  '/customers': {
    title: 'Customers',
    breadcrumb: 'Customers',
  },
  '/invoices': {
    title: 'Invoices',
    breadcrumb: 'Invoices',
  },
  '/quick-invoice': {
    title: 'Quick Invoice',
    breadcrumb: 'Quick Invoice',
  },
  '/company': {
    title: 'Company Profile',
    breadcrumb: 'Company Profile',
  },
  // Settings metadata is temporarily disabled with the route.
  '/login': {
    title: 'Login',
    breadcrumb: 'Login',
  },
  '/signup': {
    title: 'Sign Up',
    breadcrumb: 'Sign Up',
  },
} as const

export type RouteKey = keyof typeof routeMetadata
