import { useState } from 'react'
import { PackagePlus } from 'lucide-react'
import { useCatalog } from '../../../hooks/useCatalog'
import { useStockAvailability } from '../../../hooks/useInventory'
import { formatStockQuantity, isOutOfStock } from '../../../types/inventory'
import {
  catalogDescription,
  type CatalogItem,
  type CatalogSelection,
} from '../../../types/catalog'
import { money } from '../../../services/invoiceCalculation.service'
import { formatCurrency } from '../../../utils/formatters'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { CatalogItemForm } from './CatalogItemForm'

export function CatalogPicker({
  currency,
  onSelect,
  disabled,
}: {
  currency: string
  onSelect: (selection: CatalogSelection) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        size="small"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <PackagePlus size={16} className="mr-2" />
        Add from catalog
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Choose a product or service"
        size="large"
      >
        {open && (
          <CatalogBrowser
            currency={currency}
            onSelect={selection => {
              onSelect(selection)
              setOpen(false)
            }}
          />
        )}
      </Modal>
    </>
  )
}

function CatalogBrowser({
  currency,
  onSelect,
}: {
  currency: string
  onSelect: (selection: CatalogSelection) => void
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [foreign, setForeign] = useState<CatalogItem | null>(null)
  const [price, setPrice] = useState('')
  const query = useCatalog({ search, status: 'active', page, limit: 10 })
  const stock = useStockAvailability(
    query.data?.data
      .filter(item => item.type === 'product' && item.stockTrackingStartedAt)
      .map(item => item.id) ?? []
  )
  const quantities = new Map(
    stock.data?.map(balance => [balance.product.id, balance.quantity])
  )
  const select = (item: CatalogItem, rate = item.rate) =>
    onSelect({
      catalogItemId: item.id,
      type: item.type,
      description: catalogDescription(item),
      unit: item.unit,
      quantity: 1,
      rate,
      amount: money(rate, currency),
    })
  const choose = (item: CatalogItem) => {
    if (item.currency === currency) select(item)
    else {
      setForeign(item)
      setPrice('')
      setCreating(false)
    }
  }
  if (creating)
    return (
      <CatalogItemForm
        currency={currency}
        onSaved={choose}
        onCancel={() => setCreating(false)}
      />
    )
  if (foreign)
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          <strong>{foreign.name}</strong> is priced in {foreign.currency}. Enter
          a unit price in {currency} to use it on this invoice. No currency
          conversion is applied.
        </p>
        <label className="block text-sm font-medium">
          Unit price in {currency}
          <input
            autoFocus
            type="number"
            min="0"
            max="100000"
            step="any"
            value={price}
            onChange={event => setPrice(event.target.value)}
            className="mt-1 w-full rounded-lg border p-2"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setForeign(null)}
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={
              !price.trim() ||
              !Number.isFinite(Number(price)) ||
              Number(price) < 0 ||
              Number(price) > 100000
            }
            onClick={() => select(foreign, Number(price))}
          >
            Add item
          </Button>
        </div>
      </div>
    )
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Search catalog"
          value={search}
          onChange={event => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Search name, SKU, or description"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setCreating(true)}
        >
          New catalog item
        </Button>
      </div>
      {query.isPending && (
        <p role="status" className="text-sm text-slate-500">
          Loading catalog…
        </p>
      )}
      {query.error && (
        <div role="alert" className="text-sm text-red-700">
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
            <p className="py-6 text-center text-sm text-slate-500">
              No matching items. Create an item here, or close this window to
              enter a one-off charge.
            </p>
          )}
          <ul className="divide-y divide-slate-100">
            {query.data.data.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => choose(item)}
                  className="flex w-full items-center justify-between gap-4 rounded-lg px-2 py-3 text-left hover:bg-primary-50 focus-visible:outline-primary-500"
                >
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold text-slate-800">
                      {item.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {item.type === 'service' ? 'Service' : 'Product'}
                      {item.sku ? ` · ${item.sku}` : ''} · {item.unit}
                    </span>
                    {item.type === 'product' && item.stockTrackingStartedAt && (
                      <span className="mt-1 block text-xs text-slate-600">
                        {stock.error
                          ? 'Stock unavailable'
                          : quantities.has(item.id)
                            ? `${isOutOfStock(quantities.get(item.id)!) ? 'Out of stock · ' : ''}Available: ${formatStockQuantity(quantities.get(item.id)!)} ${item.unit}`
                            : 'Loading stock…'}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm">
                    {formatCurrency(item.rate, item.currency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {stock.error && (
            <p role="alert" className="text-xs text-red-700">
              Stock availability could not be loaded.{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void stock.refetch()}
              >
                Retry stock lookup
              </button>
            </p>
          )}
          {!!stock.data?.length && (
            <p className="text-xs text-slate-500">
              Drafts do not reserve stock. Stock is deducted when an invoice is
              issued.
            </p>
          )}
          <div className="flex items-center justify-between border-t pt-3 text-xs text-slate-500">
            <span>
              {query.data.total} {query.data.total === 1 ? 'item' : 'items'}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="small"
                variant="ghost"
                disabled={!query.data.hasPrev}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="small"
                variant="ghost"
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
