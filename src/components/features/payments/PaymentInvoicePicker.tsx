import { useState } from 'react'
import { usePayableInvoices } from '../../../hooks/usePayments'
import { formatPayment } from '../../../types/payments'
import { Button } from '../../ui/Button'
import { Link } from 'react-router-dom'

export function PaymentInvoicePicker({
  onSelect,
}: {
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const query = usePayableInvoices({ search, page, limit: 10 })
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-500">
        Choose an issued INR invoice with an outstanding balance.
      </p>
      <input
        autoFocus
        aria-label="Search payable invoices"
        value={search}
        maxLength={200}
        onChange={event => {
          setSearch(event.target.value)
          setPage(1)
        }}
        placeholder="Search invoice number or customer"
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
      />
      {query.isPending && <p role="status">Loading invoices…</p>}
      {query.error && (
        <p role="alert" className="text-sm text-red-700">
          {query.error.message}{' '}
          <button
            className="underline"
            type="button"
            onClick={() => void query.refetch()}
          >
            Try again
          </button>
        </p>
      )}
      {query.data && (
        <>
          <ul className="divide-y divide-slate-100">
            {query.data.data.map(invoice => (
              <li key={invoice.id}>
                <button
                  type="button"
                  className="w-full space-y-1 rounded-lg p-3 text-left text-sm hover:bg-primary-50 focus-ring-inset"
                  onClick={() => onSelect(invoice.id)}
                >
                  <span className="block break-words font-semibold text-slate-800">
                    {invoice.invoiceNumber}
                  </span>
                  <span className="block break-words text-slate-500">
                    {invoice.customerName}
                  </span>
                  <span className="block font-medium text-primary-700">
                    Balance {formatPayment(invoice.balance, invoice.currency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!query.data.data.length && (
            <p className="py-3 text-sm text-slate-500">
              No matching unpaid INR invoices.{' '}
              <Link className="text-primary-700 underline" to="/invoices">
                Review invoices
              </Link>
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>{query.data.total} invoices</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="small"
                disabled={!query.data.hasPrev}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="small"
                disabled={!query.data.hasNext}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
