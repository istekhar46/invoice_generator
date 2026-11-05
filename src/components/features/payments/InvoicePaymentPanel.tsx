import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Invoice } from '../../../types/entities'
import { gatewayStateLabel } from '../../../types/razorpay'
import { useRazorpaySetup } from '../../../hooks/useRazorpay'
import { useGatewayCommand, useGatewayLinks } from '../../../hooks/useGateway'
import {
  documentPaymentUrl,
  documentTotals,
} from '../../../utils/invoiceDocument'
import { formatCurrency } from '../../../utils/formatters'
import { Button } from '../../ui/Button'
import { CreatePaymentLinkDialog } from './CreatePaymentLinkDialog'
import { DirectUpiInvoiceControls } from './DirectUpiInvoiceControls'

/** Owner controls stay outside the printable/customer document. */
export function InvoicePaymentPanel({
  invoice,
  refreshing = false,
}: {
  invoice: Invoice
  refreshing?: boolean
}) {
  const history = (
    <Link
      className="text-sm text-primary-700 underline"
      to={`/payments?invoice=${encodeURIComponent(invoice.id)}`}
    >
      Payment history
    </Link>
  )
  if (
    invoice.status !== 'sent' ||
    invoice.currency !== 'INR' ||
    documentTotals(invoice).balanceDue <= 0
  ) {
    const message =
      invoice.status === 'voided'
        ? 'This invoice is voided. No payment is due.'
        : invoice.status === 'draft'
          ? 'Issue this invoice before collecting online payments.'
          : documentTotals(invoice).balanceDue <= 0
            ? 'This invoice has no remaining balance.'
            : 'Online UPI payment links are available for INR invoices.'
    return (
      <section
        aria-label="Invoice payments"
        className="no-print mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <p className="mb-2 text-sm text-slate-600">{message}</p>
        {invoice.directUpi && (
          <DirectUpiInvoiceControls invoice={invoice} refreshing={refreshing} />
        )}
        {history}
      </section>
    )
  }
  return (
    <>
      <DirectUpiInvoiceControls
        key={`upi-${invoice.id}`}
        invoice={invoice}
        refreshing={refreshing}
      />
      {!invoice.directUpi && (
        <LiveInvoicePayments
          key={invoice.id}
          invoice={invoice}
          refreshing={refreshing}
        />
      )}
    </>
  )
}

function LiveInvoicePayments({
  invoice,
  refreshing,
}: {
  invoice: Invoice
  refreshing: boolean
}) {
  const setup = useRazorpaySetup()
  const links = useGatewayLinks({
    mode: 'LIVE',
    invoiceId: invoice.id,
    limit: 1,
  })
  const mutation = useGatewayCommand()
  const [creating, setCreating] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [copy, setCopy] = useState<{
    url: string
    error: boolean
    message: string
  } | null>(null)
  const current = links.data?.data[0]
  const enabled =
    setup.data?.setupAvailable &&
    setup.data.connections.some(
      connection => connection.mode === 'LIVE' && connection.enabled
    )
  const busy = refreshing || mutation.isPending
  const url = refreshing ? null : documentPaymentUrl(invoice)
  const unresolved =
    current &&
    ['PENDING', 'ACTIVE', 'UNKNOWN', 'CANCELLING'].includes(current.state)
  const retry = () => {
    void setup.refetch()
    void links.refetch()
  }
  return (
    <section
      aria-label="Invoice payments"
      className="no-print mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Collect payment</h3>
          <p className="mt-1 text-sm text-slate-600">
            Balance due:{' '}
            <strong>
              {formatCurrency(
                documentTotals(invoice).balanceDue,
                invoice.currency
              )}
            </strong>
          </p>
        </div>
        <Link
          className="text-sm text-primary-700 underline"
          to={`/payments/links?invoice=${encodeURIComponent(invoice.id)}&mode=LIVE`}
        >
          Manage payment links
        </Link>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Customers pay through Razorpay. Confirmed payments update this invoice
        automatically. Scanning or opening a link does not mark it paid.
      </p>
      {refreshing && (
        <p role="status" className="mt-3 text-sm">
          Updating invoice payment details…
        </p>
      )}
      {(setup.isPending || links.isPending) && (
        <p role="status" className="mt-3 text-sm">
          Loading payment setup…
        </p>
      )}
      {(setup.error || links.error) && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {setup.error?.message || links.error?.message}{' '}
          <button type="button" className="underline" onClick={retry}>
            Retry payments
          </button>
        </p>
      )}
      {!setup.isPending && !setup.error && !enabled && (
        <p className="mt-3 text-sm text-slate-600">
          Connect and enable your Live Razorpay account to collect payments.{' '}
          <Link className="text-primary-700 underline" to="/payments/settings">
            Payment settings
          </Link>
        </p>
      )}
      {!links.isPending && !links.error && (
        <p className="mt-3 text-sm text-slate-600">
          Payment link:{' '}
          {current ? gatewayStateLabel(current.state) : 'Not created'}
          {current?.synchronizedAt && (
            <span className="block text-xs">
              Last checked {new Date(current.synchronizedAt).toLocaleString()}
            </span>
          )}
        </p>
      )}
      {current?.lastError && (
        <p role="alert" className="mt-2 text-sm text-amber-800">
          {current.lastError}
        </p>
      )}
      {enabled &&
        !setup.error &&
        !links.error &&
        !setup.isPending &&
        !links.isPending && (
          <div className="mt-4 flex flex-wrap gap-2">
            {!unresolved && (
              <Button
                type="button"
                size="small"
                disabled={busy}
                onClick={() => setCreating(true)}
              >
                Create payment link
              </Button>
            )}
            {url && (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Open checkout
                </a>
                <Button
                  type="button"
                  size="small"
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url)
                      setCopy({
                        url,
                        error: false,
                        message: 'Payment link copied.',
                      })
                    } catch {
                      setCopy({
                        url,
                        error: true,
                        message:
                          'Could not copy. Use the payment link shown on the invoice.',
                      })
                    }
                  }}
                >
                  Copy link
                </Button>
              </>
            )}
            {current && (
              <Button
                type="button"
                size="small"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  mutation.mutate({ type: 'refresh', id: current.id })
                }
              >
                Refresh payment status
              </Button>
            )}
            {current && ['PENDING', 'UNKNOWN'].includes(current.state) && (
              <Button
                type="button"
                size="small"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  mutation.mutate({ type: 'retry', id: current.id })
                }
              >
                Retry link creation
              </Button>
            )}
            {unresolved && (
              <Button
                type="button"
                size="small"
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirmCancel(true)}
              >
                Cancel payment link
              </Button>
            )}
          </div>
        )}
      {confirmCancel && current && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm">
            Cancel this payment link? This stops checkout through the link and
            keeps the invoice and payment history.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="small"
              variant="danger"
              loading={mutation.isPending}
              disabled={busy}
              onClick={() =>
                mutation.mutate(
                  { type: 'cancel', id: current.id },
                  { onSuccess: () => setConfirmCancel(false) }
                )
              }
            >
              Confirm cancellation
            </Button>
            <Button
              type="button"
              size="small"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmCancel(false)}
            >
              Keep link
            </Button>
          </div>
        </div>
      )}
      {mutation.isPending && (
        <p role="status" className="mt-3 text-sm">
          Checking with Razorpay…
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {mutation.error.message}
        </p>
      )}
      {copy && copy.url === url && (
        <p
          role={copy.error ? 'alert' : 'status'}
          className="mt-3 text-sm text-slate-600"
        >
          {copy.message}
        </p>
      )}
      {creating && (
        <CreatePaymentLinkDialog
          mode="LIVE"
          initialInvoiceId={invoice.id}
          onClose={() => setCreating(false)}
          onSaved={() => setCreating(false)}
        />
      )}
    </section>
  )
}
