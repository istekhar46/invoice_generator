import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Pencil, Plus } from 'lucide-react'
import { useArchiveCatalogItem, useCatalog } from '../hooks/useCatalog'
import type { CatalogItem } from '../types/catalog'
import type { LineItemType } from '../types/entities'
import { formatCurrency } from '../utils/formatters'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { CatalogItemForm } from '../components/features/catalog/CatalogItemForm'
import { StockActionDialog } from '../components/features/inventory/StockActionDialog'

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [tracking, setTracking] = useState<CatalogItem | null>(null)
  const [stockSaved, setStockSaved] = useState(false)
  const [type, setType] = useState<LineItemType | ''>('')
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<CatalogItem | null | undefined>(
    undefined
  )
  const query = useCatalog({
    search,
    type: type || undefined,
    status,
    page,
    limit: 20,
  })
  const archive = useArchiveCatalogItem()
  const control =
    'rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm'
  return (
    <ResponsiveContainer maxWidth="xl" padding="md">
      <div className="py-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex rounded-xl bg-primary-50 p-3 text-primary-600">
              <Package size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Products &amp; Services
            </h1>
            <p className="mt-2 max-w-lg text-sm text-slate-500">
              Keep reusable items and prices together. Add them to invoices
              while keeping each invoice's saved values intact.
            </p>
          </div>
          <Button type="button" onClick={() => setEditing(null)}>
            <Plus size={17} className="mr-2" />
            New item
          </Button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {stockSaved && (
            <p
              role="status"
              className="m-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              Stock tracking started.{' '}
              <Link to="/inventory" className="underline">
                View inventory
              </Link>
            </p>
          )}
          <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
            <input
              aria-label="Search products and services"
              value={search}
              onChange={event => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search name, SKU, or description"
              className={`${control} min-w-0 flex-1 basis-56`}
            />
            <select
              aria-label="Filter item type"
              value={type}
              onChange={event => {
                setType(event.target.value as LineItemType | '')
                setPage(1)
              }}
              className={control}
            >
              <option value="">All types</option>
              <option value="product">Products</option>
              <option value="service">Services</option>
            </select>
            <select
              aria-label="Filter item status"
              value={status}
              onChange={event => {
                setStatus(event.target.value as typeof status)
                setPage(1)
              }}
              className={control}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All statuses</option>
            </select>
          </div>
          {archive.error && (
            <p
              role="alert"
              className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {archive.error.message}
            </p>
          )}
          {query.isPending && (
            <p
              role="status"
              className="p-10 text-center text-sm text-slate-500"
            >
              Loading your catalog…
            </p>
          )}
          {query.error && (
            <div role="alert" className="p-6 text-sm text-red-700">
              {query.error.message}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void query.refetch()}
              >
                Try again
              </button>
            </div>
          )}
          {query.data && (
            <>
              {!query.data.data.length && (
                <div className="px-5 py-16 text-center">
                  <Package className="mx-auto mb-4 text-slate-300" size={36} />
                  <h2 className="text-lg font-semibold text-slate-800">
                    {search || type || status !== 'active'
                      ? 'No matching items'
                      : 'Your catalog starts here'}
                  </h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                    {search || type || status !== 'active'
                      ? 'Try another search or filter.'
                      : 'Save a product or service once, then pick it whenever you create an invoice.'}
                  </p>
                </div>
              )}
              <ul className="divide-y divide-slate-100">
                {query.data.data.map(item => (
                  <li
                    key={item.id}
                    className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6 sm:p-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="min-w-0 max-w-full break-words font-semibold text-slate-800">
                          {item.name}
                        </h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${item.type === 'service' ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}`}
                        >
                          {item.type === 'service' ? 'Service' : 'Product'}
                        </span>
                        {item.isArchived && (
                          <span className="text-xs text-slate-400">
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-words text-sm text-slate-500">
                        {item.description ||
                          (item.sku ? `SKU ${item.sku}` : 'No description')}
                        {item.description && item.sku ? ` · ${item.sku}` : ''}
                      </p>
                    </div>
                    <p className="min-w-0 break-words text-sm font-semibold text-slate-800 sm:max-w-56">
                      {formatCurrency(item.rate, item.currency)}{' '}
                      <span className="break-all font-normal text-slate-400">
                        / {item.unit}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2 sm:max-w-72">
                      {item.type === 'product' &&
                        (item.stockTrackingStartedAt ? (
                          <Link
                            to={`/inventory?view=history&product=${encodeURIComponent(item.id)}`}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                          >
                            Stock history
                          </Link>
                        ) : (
                          !item.isArchived && (
                            <Button
                              type="button"
                              variant="outline"
                              size="small"
                              onClick={() => {
                                setStockSaved(false)
                                setTracking(item)
                              }}
                            >
                              Track stock
                            </Button>
                          )
                        ))}
                      <Button
                        type="button"
                        size="small"
                        variant="ghost"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setEditing(item)}
                      >
                        <Pencil size={15} className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        variant="ghost"
                        disabled={archive.isPending}
                        onClick={() =>
                          archive.mutate(
                            {
                              id: item.id,
                              isArchived: !item.isArchived,
                            },
                            { onSuccess: () => setPage(1) }
                          )
                        }
                      >
                        {item.isArchived ? 'Restore' : 'Archive'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm text-slate-500">
                <span>
                  {query.data.total} {query.data.total === 1 ? 'item' : 'items'}
                  {query.data.totalPages > 0
                    ? ` · Page ${page} of ${query.data.totalPages}`
                    : ''}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="small"
                    variant="outline"
                    disabled={!query.data.hasPrev}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="small"
                    variant="outline"
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
      </div>
      {tracking && (
        <StockActionDialog
          target={{ type: 'opening', product: tracking }}
          onClose={() => setTracking(null)}
          onSaved={() => {
            setTracking(null)
            setStockSaved(true)
          }}
        />
      )}
      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? 'Edit catalog item' : 'New product or service'}
      >
        {editing !== undefined && (
          <CatalogItemForm
            key={editing?.id ?? 'new'}
            item={editing ?? undefined}
            onSaved={() => setEditing(undefined)}
            onCancel={() => setEditing(undefined)}
          />
        )}
      </Modal>
    </ResponsiveContainer>
  )
}
