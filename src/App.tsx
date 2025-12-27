import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { router } from './routes'
import { ErrorBoundary } from './components/shared'
import { OfflineIndicator, OfflineBanner } from './components/shared/OfflineIndicator'
import { ToastProvider } from './hooks/useToast'
import { errorHandlerService, initializeCacheService, navigationService } from './services'
import { queryClient } from './lib'
import './index.css'

// Initialize error handler service
errorHandlerService.updateConfig({
  enableConsoleLogging: import.meta.env.DEV,
  enableErrorReporting: import.meta.env.PROD,
})

// Initialize cache invalidation service
// Requirements: 7.1, 7.6 - cache invalidation strategies and background refetch
initializeCacheService(queryClient)

/**
 * Main App component that sets up routing and provides the application shell.
 * Includes error boundary for catching and handling JavaScript errors.
 * Integrates TanStack Query for server state management and caching.
 * Enhanced with offline support and retry mechanisms.
 * 
 * Requirements: 1.1, 1.3, 1.5 - TanStack Query setup, QueryClientProvider wrapper, React Query DevTools
 * Requirements: 8.2, 8.3, 8.4, 8.5, 8.6 - Navigation, authentication-based routing, route protection, loading states, error handling, offline support, retry mechanisms
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            // Use centralized error handler
            errorHandlerService.handleError(error, 'unknown', {
              componentStack: errorInfo.componentStack,
              errorBoundary: true,
            })
          }}
        >
          {/* Enhanced offline banner for full-width notifications */}
          <OfflineBanner 
            showQueueInfo={true}
            showRetryButton={true}
          />
          
          <RouterProvider router={router} />
          
          {/* Enhanced offline indicator with queue information */}
          <OfflineIndicator 
            showQueueInfo={true}
            position="top"
          />
        </ErrorBoundary>
        {/* React Query DevTools - only enabled in development */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
