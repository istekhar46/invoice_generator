import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { ErrorBoundary } from './components/shared'
import { errorHandlerService } from './services'
import './index.css'

// Initialize error handler service
errorHandlerService.updateConfig({
  enableConsoleLogging: import.meta.env.DEV,
  enableErrorReporting: import.meta.env.PROD,
})

/**
 * Main App component that sets up routing and provides the application shell.
 * Includes error boundary for catching and handling JavaScript errors.
 * 
 * Requirements: 8.2, 8.3, 8.4, 8.5, 8.6 - Navigation, authentication-based routing, route protection, loading states, and error handling
 */
function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Use centralized error handler
        errorHandlerService.handleError(error, 'unknown', {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        })
      }}
    >
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}

export default App
