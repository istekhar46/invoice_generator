import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'
import { NavigationProvider } from '../components/providers/NavigationProvider'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import { CompanySetupGuard } from '../components/guards/CompanySetupGuard'

// Page components
import {
  LoginPage,
  SignupPage,
  DashboardPage,
  CustomersPage,
  InvoicesPage,
  CompanyProfilePage,
  SettingsPage,
  NotFoundPage,
} from '../pages'

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <NavigationProvider>
        <MainLayout />
      </NavigationProvider>
    ),
    children: [
      // Root redirect to dashboard for authenticated users, login for unauthenticated
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
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
        path: 'company',
        element: (
          <ProtectedRoute>
            <CompanyProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      
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
  '/company': {
    title: 'Company Profile',
    breadcrumb: 'Company Profile',
  },
  '/settings': {
    title: 'Settings',
    breadcrumb: 'Settings',
  },
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