import { Link } from 'react-router-dom'
import { useStockAvailability } from '../../../hooks/useInventory'
import { formatStockQuantity, isOutOfStock } from '../../../types/inventory'

interface Item {
  id?: string
  type?: string
  catalogItemId?: string | null
  description?: string
  quantity?: number
}

/** Mount only for signed-in editors. One batch lookup covers all linked product rows. */
export function InvoiceStockAvailability({
  items,
  context = 'invoice',
}: {
  items: Item[]
  context?: 'invoice' | 'quotation'
}) {
  const products = items.filter(
    item => item.type === 'product' && item.catalogItemId
  )
  return products.length ? (
    <Availability items={products} context={context} />
  ) : null
}

function Availability({
  items,
  context = 'invoice',
}: {
  items: Item[]
  context?: 'invoice' | 'quotation'
}) {
  const query = useStockAvailability(items.map(item => item.catalogItemId!))
  if (query.isPending)
    return (
      <p role="status" className="mt-3 text-xs text-slate-500">
        Loading stock availability…
      </p>
    )
  if (query.error)
    return (
      <p role="alert" className="mt-3 text-xs text-red-700">
        Stock availability could not be loaded.{' '}
        <button
          type="button"
          className="underline"
          onClick={() => void query.refetch()}
        >
          Try again
        </button>
      </p>
    )
  if (!query.data?.length) return null
  const balances = new Map(
    query.data.map(balance => [balance.product.id, balance])
  )
  return (
    <section
      aria-label={
        context === 'quotation'
          ? 'Quotation stock availability'
          : 'Invoice stock availability'
      }
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-800">
        Current stock availability
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {context === 'quotation'
          ? 'Quotations do not reserve or deduct stock. Stock is checked when the resulting invoice is issued.'
          : 'Drafts do not reserve stock. Issuing deducts stock; current availability already includes issued invoices.'}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => {
          const balance = balances.get(item.catalogItemId!)
          if (!balance) return null
          return (
            <li
              key={item.id ?? index}
              className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs"
            >
              <Link
                className="min-w-0 break-words font-medium text-primary-700 underline"
                to={`/inventory?view=history&product=${encodeURIComponent(balance.product.id)}`}
              >
                {balance.product.name}
                {balance.product.isArchived ? ' (archived)' : ''}
              </Link>
              <span className="text-slate-600">
                {context === 'quotation' ? 'Quote' : 'Invoice'} quantity:{' '}
                {item.quantity} {balance.product.unit}
              </span>
              <span
                className={
                  isOutOfStock(balance.quantity)
                    ? 'font-medium text-amber-700'
                    : 'font-medium text-emerald-700'
                }
              >
                Available: {formatStockQuantity(balance.quantity)}{' '}
                {balance.product.unit}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
