import { Link } from 'react-router-dom'
import type { Invoice } from '../../../types/entities'
import { useInvoiceUpi, useUpiPreferences } from '../../../hooks/useDirectUpi'
import { documentTotals } from '../../../utils/invoiceDocument'
import { Button } from '../../ui/Button'

export function DirectUpiInvoiceControls({
  invoice,
  refreshing = false,
}: {
  invoice: Invoice
  refreshing?: boolean
}) {
  const payable =
    invoice.status === 'sent' &&
    invoice.currency === 'INR' &&
    documentTotals(invoice).balanceDue > 0
  const query = useUpiPreferences(payable && !invoice.directUpi)
  const command = useInvoiceUpi()
  if (!payable && !invoice.directUpi) return null
  const busy = refreshing || command.isPending
  return (
    <section
      aria-label="Invoice direct UPI"
      className="no-print mb-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <h3 className="font-semibold text-slate-900">
        {invoice.directUpi ? 'Direct UPI enabled' : 'Collect directly by UPI'}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Customers pay your UPI ID directly. Verify each receipt in your UPI or
        bank app, then record the payment. Scanning never marks the invoice
        paid.
      </p>
      {invoice.directUpi ? (
        <>
          <p className="mt-3 break-all text-sm">
            {invoice.directUpi.payeeName} · {invoice.directUpi.upiId}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            These receiving details are saved on this invoice. Changes to
            Payment settings do not replace them. Removing them hides the QR
            from current views; previously downloaded or printed QRs can still
            receive payments.
          </p>
          {!payable && (
            <p className="mt-2 text-sm text-slate-600">
              The saved details are retained, but no payment QR is shown while
              this invoice is not payable in INR.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="small"
              variant="outline"
              disabled={busy}
              onClick={() =>
                command.mutate({ invoiceId: invoice.id, details: null })
              }
            >
              Remove direct UPI from invoice
            </Button>
            <Link
              className="text-sm text-primary-700 underline"
              to={`/payments?invoice=${encodeURIComponent(invoice.id)}${payable ? '&record=true' : ''}`}
            >
              {payable ? 'Record UPI payment' : 'Payment history'}
            </Link>
          </div>
        </>
      ) : (
        <>
          {query.isPending && (
            <p role="status" className="mt-3 text-sm">
              Loading receiving details…
            </p>
          )}
          {query.error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {query.error.message}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void query.refetch()}
              >
                Retry receiving details
              </button>
            </p>
          )}
          {query.data === null && (
            <p className="mt-3 text-sm">
              <Link
                className="text-primary-700 underline"
                to="/payments/settings"
              >
                Save your UPI details in Payment settings
              </Link>{' '}
              to enable an invoice QR.
            </p>
          )}
          {query.data && (
            <>
              <p className="mt-3 break-all text-sm">
                Receive as {query.data.payeeName} · {query.data.upiId}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Enabling saves these details on this invoice. Cancel any active
                or unresolved Live Razorpay link first.
              </p>
              <Button
                className="mt-4"
                type="button"
                size="small"
                disabled={
                  busy ||
                  query.isFetching ||
                  !!query.error ||
                  !!invoice.paymentUrl
                }
                onClick={() => {
                  if (query.data)
                    command.mutate({
                      invoiceId: invoice.id,
                      details: query.data,
                    })
                }}
              >
                Enable direct UPI QR
              </Button>
            </>
          )}
          <Link
            className="mt-3 block text-sm text-primary-700 underline"
            to={`/payments/links?invoice=${encodeURIComponent(invoice.id)}&mode=LIVE`}
          >
            Manage Razorpay links
          </Link>
        </>
      )}
      {command.isPending && (
        <p role="status" className="mt-3 text-sm">
          Updating invoice payment details…
        </p>
      )}
      {command.error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {command.error.message}
        </p>
      )}
    </section>
  )
}
