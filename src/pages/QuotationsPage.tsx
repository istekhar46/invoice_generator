import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { useUserProfile } from '../hooks/useAuth'
import { useQuote, useQuoteActions, useQuotes } from '../hooks/useQuotes'
import { quoteDocument, quoteParties, quoteStatusLabel } from '../types/quotes'
import type { Quote, QuoteStatus } from '../types/quotes'
import { formatCurrency } from '../utils/formatters'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { SimplePagination } from '../components/ui/Pagination'
import { InvoiceDefaultsGate } from '../components/features/invoices/InvoiceDefaultsGate'
import { InvoicePreview } from '../components/features/invoices/InvoicePreview'
import { QuoteEditor } from '../components/features/quotes/QuoteEditor'

const control = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
function Status({
  query,
}: {
  query: { isPending: boolean; error: Error | null; refetch: () => unknown }
}) {
  if (query.isPending)
    return (
      <p role="status" className="p-6 text-sm text-slate-500">
        Loading quotations…
      </p>
    )
  if (query.error)
    return (
      <p role="alert" className="p-4 text-sm text-red-700">
        {query.error.message}{' '}
        <button
          type="button"
          className="underline"
          onClick={() => void query.refetch()}
        >
          Try again
        </button>
      </p>
    )
  return null
}
function Conversion({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const { convert } = useQuoteActions(),
    navigate = useNavigate()
  const [version] = useState(quote.version),
    [number, setNumber] = useState(''),
    [serviceDate, setServiceDate] = useState(
      new Date().toISOString().slice(0, 10)
    ),
    [dueDate, setDueDate] = useState(() =>
      new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    )
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onClose={() => {
        if (!convert.isPending) onClose()
      }}
      title="Review invoice conversion"
    >
      <form
        className="space-y-4"
        onSubmit={async event => {
          event.preventDefault()
          setError('')
          try {
            const result = await convert.mutateAsync({
              id: quote.id,
              version,
              invoiceNumber: number.trim(),
              serviceDate,
              dueDate,
            })
            navigate(`/invoices?id=${encodeURIComponent(result.invoice.id)}`)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Conversion failed.')
          }
        }}
      >
        <p className="text-sm text-slate-600">
          Convert all of <strong>{quote.quoteNumber}</strong> into one draft
          invoice for{' '}
          <strong>{formatCurrency(quote.total, quote.currency)}</strong>. Items,
          currency, saved totals and party details are copied unchanged. You can
          edit the resulting draft afterward. No stock is deducted and no
          payment is recorded.
        </p>
        <fieldset disabled={convert.isPending} className="space-y-3">
          <label className="block text-sm">
            Invoice number
            <input
              maxLength={80}
              placeholder="Automatic INV number"
              value={number}
              onChange={e => setNumber(e.target.value)}
              className={`${control} mt-1 w-full`}
            />
          </label>
          <label className="block text-sm">
            Invoice date
            <input
              required
              type="date"
              value={serviceDate}
              onChange={e => setServiceDate(e.target.value)}
              className={`${control} mt-1 w-full`}
            />
          </label>
          <label className="block text-sm">
            Due date
            <input
              required
              type="date"
              min={serviceDate}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className={`${control} mt-1 w-full`}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Back
            </Button>
            <Button type="submit" loading={convert.isPending}>
              Create linked draft invoice
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
function QuoteDetail({ quote, onEdit }: { quote: Quote; onEdit: () => void }) {
  const { status } = useQuoteActions()
  const [confirmation, setConfirmation] = useState<QuoteStatus | null>(null),
    [converting, setConverting] = useState(false),
    [pdfBusy, setPdfBusy] = useState(false),
    [pdfError, setPdfError] = useState('')
  const active =
    !quote.convertedInvoice && !['CANCELLED', 'DECLINED'].includes(quote.status)
  const actions: { label: string; value: QuoteStatus }[] = []
  if (active && !quote.isExpired) {
    if (quote.status === 'DRAFT')
      actions.push({ label: 'Issue quotation', value: 'ISSUED' })
    if (quote.status === 'ISSUED')
      actions.push(
        { label: 'Record acceptance', value: 'ACCEPTED' },
        { label: 'Record decline', value: 'DECLINED' }
      )
  }
  if (active) actions.push({ label: 'Cancel quotation', value: 'CANCELLED' })
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-xl font-bold">{quote.quoteNumber}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {quoteStatusLabel(quote)} · Valid through {quote.validUntil} (UTC)
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Issuing locks the quotation; it does not send an email. Acceptance
            is recorded by you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quote.status === 'DRAFT' && (
            <Button type="button" variant="outline" onClick={onEdit}>
              Edit draft
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            loading={pdfBusy}
            onClick={async () => {
              setPdfError('')
              setPdfBusy(true)
              try {
                const { downloadQuotePDF } =
                  await import('../services/pdf/quotePDF')
                await downloadQuotePDF(quote)
              } catch (err) {
                setPdfError(
                  err instanceof Error
                    ? err.message
                    : 'PDF could not be generated.'
                )
              } finally {
                setPdfBusy(false)
              }
            }}
          >
            Download quotation PDF
          </Button>
          {actions.map(action => (
            <Button
              key={action.value}
              type="button"
              variant="outline"
              disabled={status.isPending}
              onClick={() => setConfirmation(action.value)}
            >
              {action.label}
            </Button>
          ))}
          {quote.status === 'ACCEPTED' &&
            !quote.isExpired &&
            !quote.convertedInvoice && (
              <Button type="button" onClick={() => setConverting(true)}>
                Convert to invoice
              </Button>
            )}
        </div>
      </div>
      {quote.convertedInvoice && (
        <p className="rounded-lg bg-primary-50 p-4 text-sm">
          Converted to{' '}
          <Link
            to={`/invoices?id=${encodeURIComponent(quote.convertedInvoice.id)}`}
            className="font-semibold text-primary-700 underline"
          >
            {quote.convertedInvoice.invoiceNumber}
          </Link>{' '}
          · {quote.convertedInvoice.status.toLowerCase()}. The source quotation
          is retained unchanged.
        </p>
      )}
      {pdfError && (
        <p role="alert" className="text-sm text-red-700">
          {pdfError}
        </p>
      )}
      <InvoicePreview
        invoice={quoteDocument(quote)}
        {...quoteParties(quote)}
        quotation={{ status: quoteStatusLabel(quote) }}
      />
      {confirmation && (
        <Modal
          open
          title={
            confirmation === 'ISSUED'
              ? 'Issue quotation'
              : confirmation === 'ACCEPTED'
                ? 'Record acceptance'
                : confirmation === 'DECLINED'
                  ? 'Record decline'
                  : 'Cancel quotation'
          }
          onClose={() => {
            if (!status.isPending) setConfirmation(null)
          }}
        >
          <p className="text-sm text-slate-600">
            {confirmation === 'ISSUED'
              ? 'The saved items, prices and party details will be fixed. No email is sent and stock stays unchanged.'
              : confirmation === 'ACCEPTED'
                ? 'Record that the customer accepted this quotation. Conversion remains a separate action.'
                : confirmation === 'DECLINED'
                  ? 'Record that the customer declined this quotation. It cannot be converted.'
                  : 'Keep this quotation in your records as cancelled. It cannot be reopened or converted.'}
          </p>
          {status.error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {status.error.message}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={status.isPending}
              onClick={() => setConfirmation(null)}
            >
              Back
            </Button>
            <Button
              type="button"
              loading={status.isPending}
              onClick={async () => {
                try {
                  await status.mutateAsync({
                    id: quote.id,
                    version: quote.version,
                    status: confirmation,
                  })
                  setConfirmation(null)
                } catch {
                  /* Mutation error is shown above. */
                }
              }}
            >
              Confirm
            </Button>
          </div>
        </Modal>
      )}
      {converting && (
        <Conversion quote={quote} onClose={() => setConverting(false)} />
      )}
    </div>
  )
}
function Workspace() {
  const [params, setParams] = useSearchParams()
  const id = params.get('id') ?? '',
    creating = params.get('create') === 'true',
    editing = params.get('edit') === 'true'
  const rawPage = Number(params.get('page')),
    page =
      Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100000
        ? rawPage
        : 1
  const rawStatus = params.get('status'),
    status = ['DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED', 'CANCELLED'].includes(
      rawStatus ?? ''
    )
      ? (rawStatus as QuoteStatus)
      : undefined
  const search = (params.get('search') ?? '').slice(0, 200),
    expiry = params.get('expiry') === 'expired' ? 'expired' : undefined
  const list = useQuotes({ search, status, expiry, page, limit: 20 }),
    detail = useQuote(id)
  const open = (quote: Quote) => setParams({ id: quote.id })
  const filter = (key: string, value: string) =>
    setParams(
      old => {
        const next = new URLSearchParams(old)
        next.delete('page')
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: key === 'search' }
    )
  return (
    <ResponsiveContainer maxWidth="xl" padding="md">
      <div className="space-y-6 py-6 sm:py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <FileText className="mb-3 text-primary-600" />
            <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
            <p className="mt-2 text-sm text-slate-500">
              Prepare an estimate, record acceptance and convert it into a draft
              invoice. Quotations do not affect revenue, payments or stock.
            </p>
          </div>
          {!creating && !id && (
            <Button type="button" onClick={() => setParams({ create: 'true' })}>
              <Plus size={16} className="mr-2" />
              New quotation
            </Button>
          )}
          {(creating || id) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setParams({})}
            >
              Back to quotations
            </Button>
          )}
        </header>
        {creating ? (
          <InvoiceDefaultsGate enabled includeLogo>
            {defaults => (
              <QuoteEditor
                defaults={defaults}
                onSaved={open}
                onCancel={() => setParams({})}
              />
            )}
          </InvoiceDefaultsGate>
        ) : id ? (
          <>
            <Status query={detail} />
            {detail.data &&
              !detail.error &&
              (editing && detail.data.status === 'DRAFT' ? (
                <QuoteEditor
                  key={id}
                  quote={detail.data}
                  onSaved={open}
                  onCancel={() => setParams({ id })}
                />
              ) : (
                <QuoteDetail
                  key={id}
                  quote={detail.data}
                  onEdit={() => setParams({ id, edit: 'true' })}
                />
              ))}
          </>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap gap-3 border-b p-4">
              <input
                aria-label="Search quotations"
                value={search}
                maxLength={200}
                placeholder="Search number or customer"
                className={`${control} min-w-0 flex-1`}
                onChange={e => filter('search', e.target.value)}
              />
              <select
                aria-label="Quotation status"
                value={status ?? ''}
                onChange={e => filter('status', e.target.value)}
                className={control}
              >
                <option value="">All statuses</option>
                {['DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED', 'CANCELLED'].map(
                  value => (
                    <option key={value} value={value}>
                      {value[0] + value.slice(1).toLowerCase()}
                    </option>
                  )
                )}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!expiry}
                  onChange={e =>
                    filter('expiry', e.target.checked ? 'expired' : '')
                  }
                />
                Expired only
              </label>
            </div>
            <Status query={list} />
            {list.data && !list.error && (
              <>
                {!list.data.data.length && (
                  <p className="p-10 text-center text-sm text-slate-500">
                    {search || status || expiry
                      ? 'No quotations match these filters.'
                      : 'No quotations yet. Create your first estimate.'}
                  </p>
                )}
                <ul className="divide-y">
                  {list.data.data.map(quote => (
                    <li
                      key={quote.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4"
                    >
                      <div>
                        <button
                          type="button"
                          className="font-semibold text-primary-700 underline"
                          onClick={() => open(quote)}
                        >
                          {quote.quoteNumber}
                        </button>
                        <p className="mt-1 break-words text-sm text-slate-600">
                          {quote.customerSnapshot.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Valid until {quote.validUntil} (UTC)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(quote.total, quote.currency)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {quoteStatusLabel(quote)}
                        </p>
                        <Button
                          className="mt-2"
                          type="button"
                          variant="ghost"
                          size="small"
                          onClick={() => open(quote)}
                        >
                          View quotation
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm text-slate-500">
                  <span>
                    {list.data.total} quotations · Page {page} of{' '}
                    {Math.max(1, list.data.totalPages)}
                  </span>
                  {page > 1 && !list.data.data.length ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => filter('page', '1')}
                    >
                      Back to first page
                    </Button>
                  ) : (
                    <SimplePagination
                      hasNext={list.data.hasNext}
                      hasPrev={list.data.hasPrev}
                      onNext={() => filter('page', String(page + 1))}
                      onPrev={() => filter('page', String(page - 1))}
                    />
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </ResponsiveContainer>
  )
}
export function QuotationsPage() {
  const { data: user } = useUserProfile()
  return <Workspace key={user?.id} />
}
