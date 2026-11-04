import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  History,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { useUserProfile } from '../hooks/useAuth'
import {
  useStockBalance,
  useStockBalances,
  useStockHistory,
} from '../hooks/useInventory'
import { formatStockQuantity, stockActionLabels } from '../types/inventory'
import type {
  InventoryPage as PageData,
  StockAction,
  StockActionKind,
} from '../types/inventory'
import { formatDate } from '../utils/formatters'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { SimplePagination } from '../components/ui/Pagination'
import { InventoryProductPicker } from '../components/features/inventory/InventoryProductPicker'
import { StockActionDialog } from '../components/features/inventory/StockActionDialog'
import type { StockDialogTarget } from '../components/features/inventory/StockActionDialog'

const control =
  'min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm'

function QueryStatus({
  query,
}: {
  query: { isPending: boolean; error: Error | null; refetch: () => unknown }
}) {
  if (query.isPending)
    return (
      <p role="status" className="p-10 text-center text-sm text-slate-500">
        Loading inventory…
      </p>
    )
  if (query.error)
    return (
      <p role="alert" className="p-6 text-sm text-red-700">
        {query.error.message}{' '}
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="underline"
        >
          Try again
        </button>
      </p>
    )
  return null
}

function InventoryPagination({
  data,
  page,
  onPage,
}: {
  data: PageData<unknown>
  page: number
  onPage: (page: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm text-slate-500">
      <span>
        {data.total} results
        {data.totalPages > 0 ? ` · Page ${page} of ${data.totalPages}` : ''}
      </span>
      {page > 1 && !data.data.length ? (
        <Button
          type="button"
          variant="outline"
          size="small"
          onClick={() => onPage(1)}
        >
          Back to first page
        </Button>
      ) : (
        <SimplePagination
          hasNext={data.hasNext}
          hasPrev={data.hasPrev}
          onNext={() => onPage(page + 1)}
          onPrev={() => onPage(page - 1)}
        />
      )}
    </div>
  )
}

function HistoryEntry({
  action,
  onReverse,
}: {
  action: StockAction
  onReverse: () => void
}) {
  const reversible =
    action.kind === 'ADJUSTMENT' &&
    !action.reversalOfId &&
    !action.reversedById &&
    action.movements.length === 1
  return (
    <li className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-800">
            {action.kind === 'ADJUSTMENT' && action.reversalOfId
              ? 'Adjustment reversed'
              : stockActionLabels[action.kind]}{' '}
            <span className="text-xs font-normal text-slate-400">
              #{action.sequence}
            </span>
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Effective {formatDate(new Date(`${action.effectiveDate}T00:00:00`))}{' '}
            · Recorded {new Date(action.createdAt).toLocaleString()}
          </p>
        </div>
        {action.invoiceId && (
          <Link
            to={`/invoices?id=${encodeURIComponent(action.invoiceId)}`}
            className="text-sm font-medium text-primary-700 underline"
          >
            View invoice
          </Link>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600">
        {action.reason}
      </p>
      <ul className="mt-3 space-y-2">
        {action.movements.map(movement => {
          const out = movement.quantityDelta.startsWith('-')
          return (
            <li
              key={movement.catalogItemId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
            >
              <Link
                to={`/inventory?view=history&product=${encodeURIComponent(movement.catalogItemId)}`}
                className="min-w-0 flex-1 basis-36 break-words text-sm font-medium text-slate-700 hover:underline"
              >
                {movement.product.name}
                {movement.product.isArchived && (
                  <span className="ml-2 text-xs text-slate-400">Archived</span>
                )}
              </Link>
              <span
                className={`inline-flex max-w-full items-center gap-1 break-all text-sm font-semibold tabular-nums ${out ? 'text-amber-700' : 'text-emerald-700'}`}
              >
                {out ? (
                  <ArrowUpRight
                    size={15}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowDownLeft
                    size={15}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                )}
                {out ? '' : '+'}
                {formatStockQuantity(movement.quantityDelta)}{' '}
                {movement.product.unit}
              </span>
            </li>
          )
        })}
      </ul>
      {!action.movements.length && (
        <p className="mt-3 text-xs text-slate-500">No stock movement.</p>
      )}
      {(reversible || action.reversedById || action.reversalOfId) && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {reversible && (
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={onReverse}
            >
              <RotateCcw size={14} className="mr-1" />
              Reverse adjustment #{action.sequence}
            </Button>
          )}
          {action.reversedById && (
            <span className="text-xs text-slate-500">
              {action.kind === 'INVOICE_ISSUE'
                ? 'Voided · original issue retained'
                : 'Reversed · original entry retained'}
            </span>
          )}
          {action.reversalOfId && (
            <span className="text-xs text-slate-500">
              {action.kind === 'INVOICE_VOID'
                ? 'Stock restored from original invoice issue'
                : 'Reversal · original entry retained'}
            </span>
          )}
        </div>
      )}
    </li>
  )
}

function InventoryWorkspace() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'history' ? 'history' : 'balances'
  const search = (params.get('search') ?? '').slice(0, 200)
  const statusValue = params.get('status')
  const status =
    statusValue === 'archived' || statusValue === 'all' ? statusValue : 'active'
  const productId = params.get('product') ?? ''
  const kindValue = params.get('kind')
  const kind =
    kindValue && Object.hasOwn(stockActionLabels, kindValue)
      ? (kindValue as StockActionKind)
      : undefined
  const rawPage = Number(params.get('page'))
  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1
  const [target, setTarget] = useState<StockDialogTarget | null>(null)
  const [choosingProduct, setChoosingProduct] = useState(false)
  const [saved, setSaved] = useState('')
  const balances = useStockBalances(
    { search, status, page, limit: 20 },
    view === 'balances'
  )
  const history = useStockHistory(
    { catalogItemId: productId || undefined, kind, page, limit: 20 },
    view === 'history'
  )
  const selectedProduct = useStockBalance(view === 'history' ? productId : '')
  function filter(key: string, value: string) {
    setParams(
      previous => {
        const next = new URLSearchParams(previous)
        next.delete('page')
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: key === 'search' }
    )
  }
  function open(next: StockDialogTarget) {
    setSaved('')
    setTarget(next)
  }
  const onPage = (next: number) => filter('page', String(next))
  return (
    <ResponsiveContainer maxWidth="xl" padding="md">
      <div className="py-6 sm:py-10">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex rounded-xl bg-primary-50 p-3 text-primary-600">
              <Boxes size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Inventory
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              See stock on hand and every change. Tracked products deduct stock
              when an invoice is issued.
            </p>
          </div>
          <Button type="button" onClick={() => open({ type: 'opening' })}>
            <Plus size={17} className="mr-2" />
            Track a product
          </Button>
        </div>
        {saved && (
          <p
            role="status"
            className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {saved}
          </p>
        )}
        <div className="mb-5 flex flex-wrap gap-2" aria-label="Inventory views">
          <Button
            type="button"
            variant={view === 'balances' ? 'primary' : 'outline'}
            aria-pressed={view === 'balances'}
            onClick={() => filter('view', '')}
          >
            <Boxes size={16} className="mr-2" />
            Stock balances
          </Button>
          <Button
            type="button"
            variant={view === 'history' ? 'primary' : 'outline'}
            aria-pressed={view === 'history'}
            onClick={() => filter('view', 'history')}
          >
            <History size={16} className="mr-2" />
            Timeline
          </Button>
        </div>
        <section
          aria-label={view === 'balances' ? 'Stock balances' : 'Stock timeline'}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {view === 'balances' ? (
            <>
              <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
                <input
                  aria-label="Search stock balances"
                  className={`${control} flex-1 basis-52`}
                  placeholder="Search product name or SKU"
                  maxLength={200}
                  value={search}
                  onChange={event => filter('search', event.target.value)}
                />
                <select
                  aria-label="Stock product status"
                  className={control}
                  value={status}
                  onChange={event => filter('status', event.target.value)}
                >
                  <option value="active">Active products</option>
                  <option value="archived">Archived products</option>
                  <option value="all">All products</option>
                </select>
              </div>
              <QueryStatus query={balances} />
              {balances.data && !balances.error && (
                <>
                  {!balances.data.data.length && (
                    <div className="px-5 py-14 text-center">
                      <Boxes
                        size={36}
                        className="mx-auto mb-4 text-slate-300"
                      />
                      <h2 className="text-lg font-semibold text-slate-800">
                        {search || status !== 'active'
                          ? 'No matching stock'
                          : 'Start with your stock on hand'}
                      </h2>
                      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                        {search || status !== 'active'
                          ? 'Try another search or product status.'
                          : 'Choose a product from your catalog and enter its opening quantity. Services do not need stock tracking.'}
                      </p>
                      {!search && status === 'active' && (
                        <Button
                          className="mt-5"
                          type="button"
                          variant="outline"
                          onClick={() => open({ type: 'opening' })}
                        >
                          Choose a product
                        </Button>
                      )}
                    </div>
                  )}
                  <ul className="divide-y divide-slate-100">
                    {balances.data.data.map(({ product, quantity }) => (
                      <li
                        key={product.id}
                        className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:p-5"
                      >
                        <div className="min-w-0">
                          <h2 className="break-words font-semibold text-slate-800">
                            {product.name}
                            {product.isArchived && (
                              <span className="ml-2 text-xs font-normal text-slate-400">
                                Archived
                              </span>
                            )}
                          </h2>
                          {product.sku && (
                            <p className="mt-1 break-words text-xs text-slate-500">
                              {product.sku}
                            </p>
                          )}
                          <p className="mt-2 break-words text-xl font-semibold tabular-nums text-slate-900">
                            {formatStockQuantity(quantity)}{' '}
                            <span className="text-sm font-normal text-slate-500">
                              {product.unit}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Button
                            type="button"
                            size="small"
                            variant="outline"
                            aria-label={`Adjust stock for ${product.name}`}
                            onClick={() =>
                              open({ type: 'adjustment', product })
                            }
                          >
                            Adjust stock
                          </Button>
                          <Link
                            className="rounded-lg px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 focus-ring"
                            aria-label={`History for ${product.name}`}
                            to={`/inventory?view=history&product=${encodeURIComponent(product.id)}`}
                          >
                            History
                            <span className="sr-only"> for {product.name}</span>
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <InventoryPagination
                    data={balances.data}
                    page={page}
                    onPage={onPage}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
                <Button
                  type="button"
                  size="small"
                  variant="outline"
                  className="max-w-full break-words"
                  onClick={() => setChoosingProduct(true)}
                >
                  {productId
                    ? (selectedProduct.data?.product.name ?? 'Selected product')
                    : 'All tracked products'}
                </Button>
                {productId && (
                  <button
                    type="button"
                    onClick={() => filter('product', '')}
                    className="text-sm text-slate-500 underline"
                  >
                    Clear product filter
                  </button>
                )}
                <select
                  aria-label="Movement type"
                  className={control}
                  value={kind ?? ''}
                  onChange={event => filter('kind', event.target.value)}
                >
                  <option value="">All movements</option>
                  {Object.entries(stockActionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="border-b border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-500">
                Newest recorded changes first. Effective dates can differ from
                the order entries were recorded.
              </p>
              {selectedProduct.error && productId && (
                <p role="alert" className="px-4 pt-4 text-sm text-red-700">
                  {selectedProduct.error.message} Clear the product filter or
                  choose another product.
                </p>
              )}
              <QueryStatus query={history} />
              {history.data && !history.error && (
                <>
                  {!history.data.data.length && (
                    <div className="px-5 py-14 text-center">
                      <History
                        className="mx-auto mb-4 text-slate-300"
                        size={36}
                      />
                      <h2 className="text-lg font-semibold text-slate-800">
                        No stock history
                        {productId || kind ? ' matches these filters' : ' yet'}
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Opening stock, adjustments and invoice movements appear
                        here.
                      </p>
                    </div>
                  )}
                  <ul className="divide-y divide-slate-100">
                    {history.data.data.map(action => (
                      <HistoryEntry
                        key={action.id}
                        action={action}
                        onReverse={() => open({ type: 'reversal', action })}
                      />
                    ))}
                  </ul>
                  <InventoryPagination
                    data={history.data}
                    page={page}
                    onPage={onPage}
                  />
                </>
              )}
            </>
          )}
        </section>
      </div>
      {choosingProduct && (
        <Modal
          open
          onClose={() => setChoosingProduct(false)}
          title="Filter by product"
        >
          <InventoryProductPicker
            tracking="tracked"
            onSelect={product => {
              filter('product', product.id)
              setChoosingProduct(false)
            }}
          />
        </Modal>
      )}
      {target && (
        <StockActionDialog
          target={target}
          onClose={() => setTarget(null)}
          onSaved={() => {
            setTarget(null)
            setSaved('Stock change saved.')
          }}
        />
      )}
    </ResponsiveContainer>
  )
}

export function InventoryPage() {
  const { data: user } = useUserProfile()
  return <InventoryWorkspace key={user?.id} />
}
