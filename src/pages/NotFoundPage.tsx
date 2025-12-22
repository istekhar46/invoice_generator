import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Home } from 'lucide-react'

/**
 * NotFoundPage component for handling 404 errors.
 */
export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
            Page not found
          </h2>
          <p className="mt-2 text-base text-gray-500">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>

        <div className="mt-8">
          <Link to="/dashboard">
            <Button>
              <Home className="h-4 w-4 mr-2" />
              Go back home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}