import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Link2, Plus } from 'lucide-react'
import { useGatewayCommand, useGatewayLinks } from '../hooks/useGateway'
import { useRazorpaySetup } from '../hooks/useRazorpay'
import type { GatewayLink, GatewayLinkState } from '../types/razorpay'
import { formatPayment } from '../types/payments'
import { Button } from '../components/ui/Button'
import { SimplePagination } from '../components/ui/Pagination'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'
import { CreatePaymentLinkDialog } from '../components/features/payments/CreatePaymentLinkDialog'

const states: GatewayLinkState[] = [
  'PENDING',
  'ACTIVE',
  'UNKNOWN',
  'CANCELLING',
  'PAID',
  'CANCELLED',
  'EXPIRED',
  'FAILED',
]
const control =
  'min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm'
const exceptionText: Record<string, string> = {
  TEST_MODE: 'Simulated funds stay separate from the real invoice balance.',
  INVOICE_VOIDED: 'This invoice was voided. These funds were not applied.',
  CURRENCY_MISMATCH: 'The payment currency differs from the payable INR invoice.',
  UNEXPECTED_METHOD: 'This payment used a method other than UPI and needs review.',
  ORDER_MISMATCH: 'The payment order differs from this link and needs review.',
  NO_PAYABLE_BALANCE: 'The invoice had no payable balance when this payment was recorded.',
  PRECISION_REVIEW: 'This amount could not be represented safely on the invoice and needs review.',
}
const stateLabel = (state: GatewayLinkState) =>
  ({
    PENDING: 'Creating',
    ACTIVE: 'Active',
    UNKNOWN: 'Needs refresh',
    CANCELLING: 'Cancelling',
    PAID: 'Paid at Razorpay',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
    FAILED: 'Creation failed',
  })[state]

function LinkCard({ link }: { link: GatewayLink }) {
  const mutation = useGatewayCommand()
  const [copyMessage, setCopyMessage] = useState('')
  const active = ['PENDING', 'ACTIVE', 'UNKNOWN', 'CANCELLING'].includes(
    link.state
  )
  return (
    <li className="min-w-0 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/invoices?id=${encodeURIComponent(link.invoiceId)}`}
            className="break-words font-semibold text-primary-700 underline"
          >
            {link.invoice.invoiceNumber}
          </Link>
          <p className="mt-1 break-all text-xs text-slate-500">
            {link.providerId ?? link.referenceId}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">
            {formatPayment(link.amount, link.currency)}
          </p>
          <span className="text-xs text-slate-500">
            {stateLabel(link.state)}
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {link.synchronizedAt
          ? `Last checked ${new Date(link.synchronizedAt).toLocaleString()}`
          : 'Awaiting provider confirmation'}
      </p>
      {link.lastError && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {link.lastError}
        </p>
      )}
      {['PENDING', 'UNKNOWN', 'CANCELLING'].includes(link.state) && (
        <p className="mt-3 text-sm text-slate-600">
          Refresh this link to resolve its state. Retry creation uses the same
          reference.{' '}
          {link.mode === 'LIVE' &&
            'Invoice balance changes are blocked until this link is resolved.'}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {link.url && (
          <>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary-700 underline"
            >
              {link.mode === 'TEST'
                ? 'Open Test checkout'
                : 'Open UPI checkout'}
            </a>
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={() => {
                const url = link.url
                if (url)
                  void navigator.clipboard.writeText(url).then(
                    () => setCopyMessage('Link copied.'),
                    () =>
                      setCopyMessage(
                        'Could not copy. Open checkout to copy its address.'
                      )
                  )
              }}
            >
              Copy link
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          size="small"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ type: 'refresh', id: link.id })}
        >
          Refresh
        </Button>
        {['PENDING', 'UNKNOWN'].includes(link.state) && (
          <Button
            type="button"
            variant="outline"
            size="small"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ type: 'retry', id: link.id })}
          >
            Retry creation
          </Button>
        )}
        {active && (
          <Button
            type="button"
            variant="ghost"
            size="small"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ type: 'cancel', id: link.id })}
          >
            Cancel link
          </Button>
        )}
        <Link
          to={`/payments?invoice=${encodeURIComponent(link.invoiceId)}`}
          className="text-sm text-slate-500 underline"
        >
          Invoice payment history
        </Link>
      </div>
      {copyMessage && (
        <p role="status" className="mt-2 text-sm text-slate-600">
          {copyMessage}
        </p>
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
      {link.payments.length > 0 && (
        <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
          {link.payments.map(payment => (
            <section
              key={payment.id}
              aria-label={`Payment ${payment.providerId}`}
              className="rounded-xl bg-slate-50 p-4"
            >
              <p className="break-all text-sm font-medium text-slate-800">
                {payment.providerId}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {link.mode === 'TEST'
                  ? 'Simulated payment'
                  : 'Verified captured payment'}{' '}
                · {payment.method.toUpperCase()} ·{' '}
                {new Date(payment.providerCreatedAt).toLocaleString()}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Received', payment.received],
                  ['Applied to invoice', payment.applied],
                  ['Refunded', payment.refunded],
                  ['Unapplied', payment.unapplied],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold tabular-nums">
                      {formatPayment(value, payment.currency)}
                    </dd>
                  </div>
                ))}
              </dl>
              {payment.exception && (
                <p
                  className={`mt-3 text-sm ${link.mode === 'TEST' ? 'text-slate-600' : 'text-amber-800'}`}
                >
                  {exceptionText[payment.exception] ?? 'This payment needs review in Razorpay.'}
                </p>
              )}
              {link.mode === 'LIVE' && /[1-9]/.test(payment.unapplied) && (
                <p className="mt-2 text-sm text-amber-800">
                  Unapplied funds need your review in Razorpay. They do not
                  reduce the invoice balance.
                </p>
              )}
              {payment.refunds.map(refund => (
                <p
                  key={refund.id}
                  className="mt-3 break-words border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-600"
                >
                  Refund {refund.providerId} · {refund.status} ·{' '}
                  {formatPayment(refund.amount, payment.currency)} · Invoice
                  paid amount reduced by{' '}
                  {formatPayment(refund.invoiceReduction, payment.currency)}
                </p>
              ))}
            </section>
          ))}
        </div>
      )}
    </li>
  )
}

export function PaymentLinksPage() {
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'LIVE' ? 'LIVE' : 'TEST'
  const invoiceId = params.get('invoice') ?? ''
  const search = (params.get('search') ?? '').slice(0, 200)
  const state = states.find(value => value === params.get('state'))
  const rawPage = Number(params.get('page'))
  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1
  const query = useGatewayLinks({
    mode,
    invoiceId: invoiceId || undefined,
    search,
    state,
    page,
    limit: 10,
  })
  const setup = useRazorpaySetup()
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const connected = setup.data?.connections.some(
    connection => connection.mode === mode && connection.enabled
  )
  function filter(key: string, value: string) {
    setParams(
      previous => {
        const next = new URLSearchParams(previous)
        if (key !== 'page') next.delete('page')
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: key === 'search' }
    )
    setMessage('')
  }
  return (
    <ResponsiveContainer maxWidth="xl" padding="md">
      <div className="py-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link2
              size={28}
              className="mb-3 text-primary-600"
              aria-hidden="true"
            />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Payment links
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Collect invoice balances through your Razorpay account. Refresh to
              check payments and refunds.
            </p>
            <div className="mt-3 flex gap-4 text-sm text-primary-700 underline">
              <Link to="/payments">Payment history</Link>
              <Link to="/payments/settings">Payment settings</Link>
            </div>
          </div>
          <Button
            type="button"
            disabled={!connected || setup.isPending}
            onClick={() => {
              setMessage('')
              setCreating(true)
            }}
          >
            <Plus size={17} className="mr-2" />
            Create {mode === 'TEST' ? 'Test' : 'Live'} link
          </Button>
        </div>
        <p
          className={`mb-5 rounded-xl p-4 text-sm leading-relaxed ${mode === 'TEST' ? 'bg-amber-50 text-amber-800' : 'bg-primary-50 text-primary-800'}`}
        >
          {mode === 'TEST'
            ? 'Test mode: simulated payments and refunds stay separate from real invoice balances and stock. Test URLs never appear on invoices or PDFs.'
            : 'Live mode: captured UPI payments update invoice balances. Refunds consume unapplied excess first. Refresh or cancel active Live links before changing invoice amounts or recording manual payments.'}
        </p>
        {setup.error && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {setup.error.message}{' '}
            <button
              type="button"
              className="underline"
              onClick={() => void setup.refetch()}
            >
              Retry settings
            </button>
          </p>
        )}
        {setup.data && !connected && (
          <p className="mb-4 text-sm text-slate-600">
            Connect and enable your {mode === 'TEST' ? 'Test' : 'Live'} account
            in{' '}
            <Link
              to="/payments/settings"
              className="text-primary-700 underline"
            >
              Payment settings
            </Link>{' '}
            to create links.
          </p>
        )}
        {message && (
          <p
            role="status"
            className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {message}
          </p>
        )}
        <section
          aria-label="Payment links history"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
            <select
              aria-label="Razorpay mode"
              className={control}
              value={mode}
              onChange={event => filter('mode', event.target.value)}
            >
              <option value="TEST">Test mode</option>
              <option value="LIVE">Live mode</option>
            </select>
            <input
              aria-label="Search payment links"
              className={`${control} flex-1 basis-52`}
              maxLength={200}
              value={search}
              placeholder="Invoice number or link reference"
              onChange={event => filter('search', event.target.value)}
            />
            <select
              aria-label="Link status"
              className={control}
              value={state ?? ''}
              onChange={event => filter('state', event.target.value)}
            >
              <option value="">All statuses</option>
              {states.map(value => (
                <option key={value} value={value}>
                  {stateLabel(value)}
                </option>
              ))}
            </select>
            {invoiceId && (
              <button
                type="button"
                onClick={() => filter('invoice', '')}
                className="text-sm text-primary-700 underline"
              >
                Clear invoice filter
              </button>
            )}
          </div>
          {query.isPending && (
            <p role="status" className="p-6">
              Loading payment links…
            </p>
          )}
          {query.error && (
            <p role="alert" className="p-6 text-sm text-red-700">
              {query.error.message}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void query.refetch()}
              >
                Try again
              </button>
            </p>
          )}
          {query.data && (
            <>
              {query.data.data.length ? (
                <ul className="divide-y divide-slate-100">
                  {query.data.data.map(link => (
                    <LinkCard key={link.id} link={link} />
                  ))}
                </ul>
              ) : (
                <p className="p-8 text-center text-sm text-slate-500">
                  No {mode === 'TEST' ? 'Test' : 'Live'} payment links found.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
                <p className="text-xs text-slate-500">
                  {query.data.total} links · Page {query.data.page} of{' '}
                  {Math.max(1, query.data.totalPages)}
                </p>
                <SimplePagination
                  hasNext={query.data.hasNext}
                  hasPrev={query.data.hasPrev}
                  onNext={() => filter('page', String(page + 1))}
                  onPrev={() => filter('page', String(page - 1))}
                />
              </div>
            </>
          )}
        </section>
        {creating && (
          <CreatePaymentLinkDialog
            mode={mode}
            initialInvoiceId={invoiceId || undefined}
            onClose={() => setCreating(false)}
            onSaved={link => {
              setCreating(false)
              setMessage(
                `${link.mode === 'TEST' ? 'Test' : 'Live'} link: ${stateLabel(link.state)}.`
              )
            }}
          />
        )}
      </div>
    </ResponsiveContainer>
  )
}
