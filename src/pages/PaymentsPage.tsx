import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, RotateCcw, Wallet } from 'lucide-react'
import { useUserProfile } from '../hooks/useAuth'
import { usePaymentHistory, usePaymentInvoice } from '../hooks/usePayments'
import { canRecordPayment, formatPayment } from '../types/payments'
import type { PaymentEntry, PaymentKind } from '../types/payments'
import { formatDate } from '../utils/formatters'
import { Button } from '../components/ui/Button'
import { SimplePagination } from '../components/ui/Pagination'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'
import { PaymentDialog } from '../components/features/payments/PaymentDialog'
import type { PaymentTarget } from '../components/features/payments/PaymentDialog'

const control =
  'min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm'
const labels: Record<PaymentKind, string> = {
  OPENING: 'Opening balance',
  UPI: 'UPI receipt',
  REVERSAL: 'Reversal',
  RAZORPAY: 'Razorpay payment',
  REFUND: 'Razorpay refund',
}
function Entry({
  entry,
  onReverse,
  onFilter,
}: {
  entry: PaymentEntry
  onReverse: () => void
  onFilter: () => void
}) {
  const reversible =
    (entry.kind === 'OPENING' || entry.kind === 'UPI') &&
    !entry.reversedById &&
    entry.invoice.status !== 'VOIDED'
  return (
    <li className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-800">
            {labels[entry.kind]}{' '}
            <span className="text-xs font-normal text-slate-400">
              #{entry.sequence}
            </span>
          </h2>
          <p className="mt-1 break-words text-sm text-slate-500">
            {entry.kind === 'OPENING'
              ? entry.openingSource === 'GUEST_IMPORT'
                ? 'Owner-provided guest draft balance'
                : 'Migrated recorded paid balance'
              : entry.kind === 'UPI'
                ? 'Recorded by account owner · not gateway verified'
                : entry.kind === 'RAZORPAY'
                  ? 'Gateway-verified captured UPI payment'
                  : entry.kind === 'REFUND'
                    ? 'Processed gateway refund · excess refunded first'
                    : `Correction of entry #${entry.reversalOfSequence}`}
          </p>
        </div>
        <p
          className={`max-w-full break-words font-semibold tabular-nums ${entry.kind === 'REVERSAL' || entry.kind === 'REFUND' ? 'text-amber-700' : 'text-emerald-700'}`}
        >
          {formatPayment(entry.amount, entry.currency)}
        </p>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        {entry.paymentDate
          ? `${entry.kind === 'REVERSAL' ? 'Correction' : 'Payment'} date: ${formatDate(new Date(`${entry.paymentDate}T00:00:00`))}`
          : 'Payment method and date unknown'}{' '}
        · Recorded {new Date(entry.createdAt).toLocaleString()}
      </p>
      {entry.reference && (
        <p className="mt-2 break-words text-sm text-slate-700">
          Reference: {entry.reference}
        </p>
      )}
      {entry.notes && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
          {entry.notes}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <Link
          to={`/invoices?id=${encodeURIComponent(entry.invoice.id)}`}
          className="max-w-full break-words font-medium text-primary-700 underline"
        >
          {entry.invoice.invoiceNumber}
        </Link>
        <button
          type="button"
          onClick={onFilter}
          className="text-slate-500 underline"
        >
          Filter this invoice
        </button>
        {entry.reversedById && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
            Reversed · original retained
          </span>
        )}
        {reversible && (
          <Button
            type="button"
            variant="ghost"
            size="small"
            onClick={onReverse}
          >
            <RotateCcw size={14} className="mr-1" />
            Reverse entry #{entry.sequence}
          </Button>
        )}
        {(entry.kind === 'RAZORPAY' || entry.kind === 'REFUND') && (
          <Link
            to={`/payments/links?invoice=${encodeURIComponent(entry.invoice.id)}&mode=LIVE`}
            className="text-primary-700 underline"
          >
            Gateway details
          </Link>
        )}
      </div>
    </li>
  )
}
function PaymentsWorkspace() {
  const [params, setParams] = useSearchParams()
  const invoiceId = params.get('invoice') ?? ''
  const search = (params.get('search') ?? '').slice(0, 200)
  const kindValue = params.get('kind')
  const kind =
    kindValue && Object.hasOwn(labels, kindValue)
      ? (kindValue as PaymentKind)
      : undefined
  const statusValue = params.get('status')
  const status =
    statusValue === 'active' || statusValue === 'reversed' ? statusValue : 'all'
  const dateFrom = params.get('from') ?? ''
  const dateTo = params.get('to') ?? ''
  const rawPage = Number(params.get('page'))
  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1
  const [target, setTarget] = useState<PaymentTarget | null>(null)
  const [message, setMessage] = useState('')
  const history = usePaymentHistory({
    invoiceId: invoiceId || undefined,
    search,
    kind,
    status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 20,
  })
  const invoice = usePaymentInvoice(invoiceId)
  const dialog =
    target ??
    (params.get('record') === 'true' && invoiceId
      ? { type: 'record' as const, invoiceId }
      : null)
  function filter(key: string, value: string) {
    setParams(
      previous => {
        const next = new URLSearchParams(previous)
        next.delete('page')
        next.delete('record')
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: key === 'search' }
    )
  }
  function close() {
    setTarget(null)
    if (params.has('record')) filter('record', '')
  }
  function open(next: PaymentTarget) {
    setMessage('')
    setTarget(next)
  }
  return (
    <ResponsiveContainer maxWidth="xl" padding="md">
      <div className="py-6 sm:py-10">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex rounded-xl bg-primary-50 p-3 text-primary-600">
              <Wallet size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Payments
            </h1>
            <Link
              to="/payments/settings"
              className="mt-2 inline-block text-sm text-primary-700 underline"
            >
              Payment settings
            </Link>
            <Link
              to="/payments/links"
              className="ml-4 mt-2 inline-block text-sm text-primary-700 underline"
            >
              Payment links
            </Link>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Track recorded UPI receipts, verified Razorpay payments and refunds.
              New UPI receipts are available for issued INR invoices.
            </p>
          </div>
          <Button
            type="button"
            onClick={() =>
              open({ type: 'record', invoiceId: invoiceId || undefined })
            }
          >
            <Plus size={17} className="mr-2" />
            Record UPI payment
          </Button>
        </div>
        {message && (
          <p
            role="status"
            className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {message}
          </p>
        )}
        {invoiceId && (
          <section
            className="mb-5 rounded-2xl border border-slate-200 bg-white p-5"
            aria-label="Invoice payment summary"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="min-w-0 break-words font-semibold text-slate-800">
                {invoice.data?.invoiceNumber ?? 'Selected invoice'}
              </h2>
              <button
                type="button"
                onClick={() => filter('invoice', '')}
                className="text-sm text-slate-500 underline"
              >
                Clear invoice filter
              </button>
            </div>
            {invoice.isPending && (
              <p role="status" className="mt-3 text-sm">
                Loading invoice balance…
              </p>
            )}
            {invoice.error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {invoice.error.message}{' '}
                <button
                  className="underline"
                  type="button"
                  onClick={() => void invoice.refetch()}
                >
                  Retry invoice
                </button>
              </p>
            )}
            {invoice.data && (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {[
                    ['Total', invoice.data.total],
                    ['Amount paid', invoice.data.amountPaid],
                    ['Balance due', invoice.data.balance],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-1 break-words font-semibold tabular-nums text-slate-800">
                        {formatPayment(value, invoice.data.currency)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    to={`/invoices?id=${encodeURIComponent(invoiceId)}`}
                    className="text-sm text-primary-700 underline"
                  >
                    View invoice
                  </Link>
                  <span className="text-xs capitalize text-slate-500">
                    {invoice.data.status.toLowerCase()}
                  </span>
                  {canRecordPayment(invoice.data) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      onClick={() => open({ type: 'record', invoiceId })}
                    >
                      Record payment for this invoice
                    </Button>
                  )}
                </div>
              </>
            )}
          </section>
        )}
        <section
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          aria-label="Payments Timeline"
        >
          <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
            <input
              aria-label="Search payment history"
              className={`${control} flex-1 basis-52`}
              placeholder="Search invoice number or UPI reference"
              maxLength={200}
              value={search}
              onChange={event => filter('search', event.target.value)}
            />
            <select
              aria-label="Payment entry type"
              className={control}
              value={kind ?? ''}
              onChange={event => filter('kind', event.target.value)}
            >
              <option value="">All entries</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Payment entry status"
              className={control}
              value={status}
              onChange={event => filter('status', event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active payments</option>
              <option value="reversed">Reversed payments</option>
            </select>
            <label className="min-w-0 text-xs text-slate-500">
              From
              <input
                aria-label="Payment date from"
                className={`${control} ml-2 max-w-full`}
                type="date"
                value={dateFrom}
                onChange={event => filter('from', event.target.value)}
              />
            </label>
            <label className="min-w-0 text-xs text-slate-500">
              To
              <input
                aria-label="Payment date to"
                className={`${control} ml-2 max-w-full`}
                type="date"
                value={dateTo}
                onChange={event => filter('to', event.target.value)}
              />
            </label>
          </div>
          <p className="border-b border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-500">
            Newest recorded entries first. Opening balances have no known
            payment date and are excluded by date filters. A reversal corrects
            records without transferring money.
          </p>
          {history.isPending && (
            <p
              role="status"
              className="p-10 text-center text-sm text-slate-500"
            >
              Loading payment history…
            </p>
          )}
          {history.error && (
            <p role="alert" className="p-6 text-sm text-red-700">
              {history.error.message}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void history.refetch()}
              >
                Try again
              </button>
            </p>
          )}
          {history.data && !history.error && (
            <>
              {!history.data.data.length && (
                <div className="px-5 py-14 text-center">
                  <Wallet size={36} className="mx-auto mb-4 text-slate-300" />
                  <h2 className="text-lg font-semibold text-slate-800">
                    No payment entries
                    {search ||
                    kind ||
                    invoiceId ||
                    dateFrom ||
                    dateTo ||
                    status !== 'all'
                      ? ' match these filters'
                      : ' yet'}
                  </h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                    Recorded UPI receipts, preserved opening balances and
                    corrections appear here.
                  </p>
                </div>
              )}
              <ul className="divide-y divide-slate-100">
                {history.data.data.map(entry => (
                  <Entry
                    key={entry.id}
                    entry={entry}
                    onReverse={() => open({ type: 'reversal', entry })}
                    onFilter={() => filter('invoice', entry.invoice.id)}
                  />
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm text-slate-500">
                <span>
                  {history.data.total} entries
                  {history.data.totalPages
                    ? ` · Page ${page} of ${history.data.totalPages}`
                    : ''}
                </span>
                {page > 1 && !history.data.data.length ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="small"
                    onClick={() => filter('page', '1')}
                  >
                    Back to first page
                  </Button>
                ) : (
                  <SimplePagination
                    hasPrev={history.data.hasPrev}
                    hasNext={history.data.hasNext}
                    onNext={() => filter('page', String(page + 1))}
                    onPrev={() => filter('page', String(page - 1))}
                  />
                )}
              </div>
            </>
          )}
        </section>
      </div>
      {dialog && (
        <PaymentDialog
          target={dialog}
          onClose={close}
          onSaved={() => {
            close()
            setMessage('Payment history saved.')
          }}
        />
      )}
    </ResponsiveContainer>
  )
}
export function PaymentsPage() {
  const { data: user } = useUserProfile()
  return <PaymentsWorkspace key={user?.id} />
}
