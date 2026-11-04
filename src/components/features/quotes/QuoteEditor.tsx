import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { LineItem } from '../../../types/entities'
import type { NewInvoiceDefaults } from '../../../types/invoiceDefaults'
import type { Quote } from '../../../types/quotes'
import { useQuoteActions } from '../../../hooks/useQuotes'
import {
  calculateInvoiceForEdit,
  SUPPORTED_CURRENCIES,
} from '../../../services/invoiceCalculation.service'
import { formatCurrency } from '../../../utils/formatters'
import { LineItemsTable } from '../invoices/LineItemsTable'
import { CustomerList } from '../customers/CustomerList'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'

const control =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm'
const today = () => new Date().toISOString().slice(0, 10)
const later = () =>
  new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
export function QuoteEditor({
  quote,
  defaults,
  onSaved,
  onCancel,
}: {
  quote?: Quote
  defaults?: NewInvoiceDefaults
  onSaved: (quote: Quote) => void
  onCancel: () => void
}) {
  const [baseVersion] = useState(quote?.version)
  const [requestId] = useState(() => crypto.randomUUID())
  const [customer, setCustomer] = useState({
    id: quote?.customerId ?? '',
    name: quote?.customerSnapshot.name ?? '',
  })
  const [picking, setPicking] = useState(false)
  const [items, setItems] = useState<LineItem[]>(quote?.lineItems ?? [])
  const [quoteDate, setQuoteDate] = useState(() => quote?.quoteDate ?? today())
  const [validUntil, setValidUntil] = useState(
    () => quote?.validUntil ?? later()
  )
  const [currency, setCurrency] = useState(
    quote?.currency ?? defaults?.settings.currency ?? 'USD'
  )
  const [tax, setTax] = useState(
    String((quote?.taxRate ?? defaults?.settings.taxRate ?? 0) * 100)
  )
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    quote?.discountType ?? 'percentage'
  )
  const [discount, setDiscount] = useState(String(quote?.discountValue ?? 0))
  const [shipping, setShipping] = useState(String(quote?.shippingAmount ?? 0))
  const [notes, setNotes] = useState(
    quote?.notes ?? defaults?.settings.notes ?? ''
  )
  const [terms, setTerms] = useState(
    quote?.terms ?? defaults?.settings.terms ?? ''
  )
  const [paymentTerms, setPaymentTerms] = useState(
    quote?.paymentTerms ?? defaults?.settings.paymentTerms ?? ''
  )
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState(
    quote?.purchaseOrderNumber ?? ''
  )
  const [shippingAddress, setShippingAddress] = useState(
    quote?.shippingAddress ?? ''
  )
  const [error, setError] = useState('')
  const { save } = useQuoteActions()
  let totals: ReturnType<typeof calculateInvoiceForEdit> | undefined,
    calculationError = ''
  try {
    totals = calculateInvoiceForEdit(items, Number(tax) / 100, {
      currency,
      discountType,
      discountValue: Number(discount),
      shippingAmount: Number(shipping),
    })
  } catch (err) {
    calculationError = err instanceof Error ? err.message : 'Check amounts.'
  }
  const companyName =
    quote?.companySnapshot.name ?? defaults?.company?.businessName
  if (!companyName)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Set up your company profile</h2>
        <p className="my-3 text-sm text-slate-500">
          Your quotations use a saved snapshot of your business details and
          logo.
        </p>
        <Link to="/company" className="text-primary-700 underline">
          Set up company profile
        </Link>
        <Button
          className="ml-4"
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          Back to quotations
        </Button>
      </div>
    )
  return (
    <form
      className="space-y-6"
      onSubmit={async event => {
        event.preventDefault()
        setError('')
        if (
          !customer.id ||
          !items.length ||
          !totals ||
          validUntil < quoteDate ||
          !tax.trim() ||
          !discount.trim() ||
          !shipping.trim()
        ) {
          setError(
            'Choose a customer, add at least one item, and check the dates and amounts.'
          )
          return
        }
        try {
          onSaved(
            await save.mutateAsync({
              id: quote?.id,
              version: baseVersion,
              clientRequestId: requestId,
              input: {
                customerId: customer.id,
                quoteDate,
                validUntil,
                currency,
                taxRate: Number(tax) / 100,
                discountType,
                discountValue: Number(discount),
                shippingAmount: Number(shipping),
                notes,
                terms,
                paymentTerms,
                purchaseOrderNumber,
                shippingAddress,
                logoDataUrl: quote?.logoDataUrl ?? defaults?.logoDataUrl ?? '',
                lineItems: items,
              },
            })
          )
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Quotation could not be saved.'
          )
        }
      }}
    >
      <fieldset disabled={save.isPending} className="space-y-6">
        <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
          <div>
            <h2 className="font-semibold text-slate-800">
              {quote?.quoteNumber ?? 'New quotation'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              From {companyName}. Business and customer details are saved with
              the quotation.
            </p>
            <p className="mt-2 text-sm">
              Customer: <strong>{customer.name || 'Not selected'}</strong>
            </p>
            <Button
              className="mt-2"
              type="button"
              variant="outline"
              onClick={() => setPicking(true)}
            >
              {customer.id ? 'Change customer' : 'Choose customer'}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Quotation date
              <input
                type="date"
                required
                value={quoteDate}
                onChange={e => setQuoteDate(e.target.value)}
                className={control}
              />
            </label>
            <label className="text-sm">
              Valid until (UTC)
              <input
                type="date"
                required
                min={quoteDate}
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                className={control}
              />
            </label>
            <label className="text-sm">
              Currency
              <select
                aria-label="Currency"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className={control}
              >
                {SUPPORTED_CURRENCIES.map(code => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Tax (%)
              <input
                type="number"
                required
                min="0"
                max="100"
                step="any"
                value={tax}
                onChange={e => setTax(e.target.value)}
                className={control}
              />
            </label>
          </div>
        </section>
        <p className="text-sm text-slate-500">
          Valid through the end of the selected date in UTC. Quotations never
          reserve or deduct stock. Changing currency does not convert prices.
        </p>
        <LineItemsTable
          lineItems={items}
          onChange={setItems}
          currency={currency}
          documentKind="quotation"
          disabled={save.isPending}
        />
        <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm">
              Notes
              <textarea
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className={control}
              />
            </label>
            <label className="block text-sm">
              Terms
              <textarea
                rows={3}
                maxLength={2000}
                value={terms}
                onChange={e => setTerms(e.target.value)}
                className={control}
              />
            </label>
            <label className="block text-sm">
              Payment terms
              <input
                maxLength={200}
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                className={control}
              />
            </label>
            <label className="block text-sm">
              PO number
              <input
                maxLength={100}
                value={purchaseOrderNumber}
                onChange={e => setPurchaseOrderNumber(e.target.value)}
                className={control}
              />
            </label>
            <label className="block text-sm">
              Ship to
              <textarea
                rows={2}
                maxLength={1000}
                value={shippingAddress}
                onChange={e => setShippingAddress(e.target.value)}
                className={control}
              />
            </label>
          </div>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Discount type
                <select
                  aria-label="Discount type"
                  value={discountType}
                  onChange={e =>
                    setDiscountType(e.target.value as 'percentage' | 'fixed')
                  }
                  className={control}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed ({currency})</option>
                </select>
              </label>
              <label className="text-sm">
                Discount value
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className={control}
                />
              </label>
            </div>
            <label className="block text-sm">
              Shipping ({currency})
              <input
                type="number"
                required
                min="0"
                step="any"
                value={shipping}
                onChange={e => setShipping(e.target.value)}
                className={control}
              />
            </label>
            {calculationError && (
              <p role="alert" className="text-sm text-red-700">
                {calculationError}
              </p>
            )}
            {totals && (
              <dl className="space-y-3 border-t pt-4 text-sm">
                {[
                  ['Subtotal', totals.subtotal],
                  ['Discount', -totals.discountAmount],
                  ['Tax', totals.taxAmount],
                  ['Total', totals.total],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <dt>{label}</dt>
                    <dd className="font-semibold">
                      {formatCurrency(Number(value), currency)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}{' '}
            {baseVersion
              ? 'Close the editor and reopen to load the latest saved version.'
              : ''}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel editing
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save draft quotation
          </Button>
        </div>
      </fieldset>
      {picking && (
        <Modal
          open
          title="Choose customer"
          size="large"
          onClose={() => setPicking(false)}
        >
          <CustomerList
            selectable
            selectedCustomerId={customer.id}
            onCustomerSelect={selected => {
              setCustomer({ id: selected.id, name: selected.name })
              setPicking(false)
            }}
          />
        </Modal>
      )}
    </form>
  )
}
