import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../../../hooks/useCatalog'
import type { StockProduct } from '../../../types/inventory'
import { Button } from '../../ui/Button'

/** Server-side tracking filters keep counts and pagination correct. */
export function InventoryProductPicker({
  tracking,
  onSelect,
}: {
  tracking: 'tracked' | 'untracked'
  onSelect: (product: StockProduct) => void
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const query = useCatalog({
    type: 'product',
    status: tracking === 'untracked' ? 'active' : 'all',
    tracking,
    search,
    page,
    limit: 10,
  })
  return (
    <div className="space-y-3">
      <input
        aria-label="Search stock products"
        autoFocus
        placeholder="Search product name or SKU"
        value={search}
        maxLength={200}
        onChange={event => {
          setSearch(event.target.value)
          setPage(1)
        }}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {query.isPending && <p role="status">Loading products…</p>}
      {query.error && (
        <p role="alert" className="text-sm text-red-700">
          {query.error.message}{' '}
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="underline"
          >
            Try again
          </button>
        </p>
      )}
      {query.data && (
        <>
          <ul className="divide-y divide-slate-100">
            {query.data.data.map(product => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onSelect(product)}
                  className="w-full rounded-lg p-3 text-left hover:bg-primary-50 focus-ring-inset"
                >
                  <span className="block break-words text-sm font-semibold text-slate-800">
                    {product.name}
                  </span>
                  <span className="block break-words text-xs text-slate-500">
                    {product.sku ? `${product.sku} · ` : ''}
                    {product.unit}
                    {product.isArchived ? ' · Archived' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!query.data.data.length && (
            <p className="py-4 text-sm text-slate-500">
              {search
                ? 'No matching products.'
                : tracking === 'untracked'
                  ? 'No active products waiting for stock tracking.'
                  : 'No tracked products yet.'}{' '}
              {tracking === 'untracked' && (
                <Link className="text-primary-700 underline" to="/products">
                  Manage products
                </Link>
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>{query.data.total} products</span>
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
