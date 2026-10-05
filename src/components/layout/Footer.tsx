import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white no-print">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-primary-600">Invoiceo</p>
            <p className="mt-1 text-sm text-gray-600">Simple tools for professional invoices.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <Link to="/about" className="text-link inline-flex min-h-11 items-center">About</Link>
            <Link to="/help" className="text-link inline-flex min-h-11 items-center">Help</Link>
          </nav>
        </div>
        <p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">© {new Date().getFullYear()} Invoiceo</p>
      </div>
    </footer>
  )
}
