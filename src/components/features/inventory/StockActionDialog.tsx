import { useState } from 'react'
import { useRecordStock, useStockBalance } from '../../../hooks/useInventory'
import { ApiError } from '../../../services/api/apiClient'
import { formatDateForInput } from '../../../utils/formatters'
import { formatStockQuantity } from '../../../types/inventory'
import type {
  StockAction,
  StockCommand,
  StockProduct,
} from '../../../types/inventory'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { InventoryProductPicker } from './InventoryProductPicker'

export type StockDialogTarget =
  | { type: 'opening'; product?: StockProduct }
  | { type: 'adjustment'; product: StockProduct }
  | { type: 'reversal'; action: StockAction }

function stockError(error: Error) {
  if (
    error.message.includes('requestId') ||
    error.message.includes('request ID')
  ) {
    return 'An earlier attempt was saved with different details. Close this form and review the timeline before adding another change.'
  }
  if (error instanceof ApiError) {
    const data = error.data as
      | { details?: { available?: string; unit?: string } }
      | undefined
    if (data?.details?.available !== undefined) {
      return `${error.message} Available: ${formatStockQuantity(data.details.available)}${data.details.unit ? ` ${data.details.unit}` : ''}.`
    }
  }
  return error.message
}

export function StockActionDialog({
  target,
  onClose,
  onSaved,
}: {
  target: StockDialogTarget
  onClose: () => void
  onSaved: () => void
}) {
  const [product, setProduct] = useState<StockProduct | undefined>(
    target.type === 'reversal'
      ? target.action.movements[0]?.product
      : target.product
  )
  // One action, including all retries. Never change this after an uncertain response.
  const [requestId] = useState(() => crypto.randomUUID())
  const [quantity, setQuantity] = useState('')
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN')
  const [reason, setReason] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(
    formatDateForInput(new Date())
  )
  const [validation, setValidation] = useState('')
  const mutation = useRecordStock()
  const balance = useStockBalance(
    target.type === 'opening' ? '' : (product?.id ?? '')
  )
  const close = () => {
    if (!mutation.isPending) onClose()
  }
  const title =
    target.type === 'opening'
      ? 'Start stock tracking'
      : target.type === 'reversal'
        ? 'Reverse adjustment'
        : 'Adjust stock'
  const control =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50'
  return (
    <Modal open onClose={close} title={title}>
      {!product ? (
        <InventoryProductPicker tracking="untracked" onSelect={setProduct} />
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault()
            if (mutation.isPending) return
            if (
              target.type !== 'reversal' &&
              (!/^\d{1,15}(?:\.\d{1,3})?$/.test(quantity) ||
                (target.type === 'adjustment' && !/[1-9]/.test(quantity)))
            ) {
              setValidation(
                `Enter ${target.type === 'opening' ? 'zero or a positive' : 'a positive'} quantity with up to 15 whole digits and 3 decimal places.`
              )
              return
            }
            if (
              !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) ||
              !Number.isFinite(Date.parse(effectiveDate)) ||
              new Date(effectiveDate).toISOString().slice(0, 10) !==
                effectiveDate
            ) {
              setValidation('Enter a valid effective date.')
              return
            }
            if (!reason.trim() || reason.trim().length > 500) {
              setValidation('Enter a reason of up to 500 characters.')
              return
            }
            setValidation('')
            const data = { requestId, reason: reason.trim(), effectiveDate }
            const command: StockCommand =
              target.type === 'reversal'
                ? { type: 'reversal', actionId: target.action.id, data }
                : target.type === 'opening'
                  ? {
                      type: 'opening',
                      productId: product.id,
                      data: { ...data, quantity, unit: product.unit },
                    }
                  : {
                      type: 'adjustment',
                      productId: product.id,
                      data: {
                        ...data,
                        quantity,
                        unit: product.unit,
                        direction,
                      },
                    }
            mutation.mutate(command, { onSuccess: onSaved })
          }}
        >
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="break-words font-semibold text-slate-900">
              {product.name}
            </p>
            <p className="mt-1 break-words text-sm text-slate-500">
              {product.sku ? `${product.sku} · ` : ''}Unit: {product.unit}
              {product.isArchived ? ' · Archived' : ''}
            </p>
            {target.type !== 'opening' && (
              <p className="mt-2 text-sm text-slate-600">
                {balance.isPending
                  ? 'Loading current stock…'
                  : balance.data
                    ? `Current stock: ${formatStockQuantity(balance.data.quantity)} ${product.unit}`
                    : 'Current stock unavailable. The server will check the balance when saving.'}
              </p>
            )}
          </div>
          {target.type === 'opening' && (
            <p className="text-sm leading-relaxed text-slate-600">
              Enter stock available now, including zero. Earlier issued invoices
              will not deduct stock. Future invoices deduct when issued.
              Tracking stays enabled and the product type and unit become fixed.
            </p>
          )}
          {target.type === 'reversal' && (
            <p className="break-words text-sm leading-relaxed text-slate-600">
              This adds an opposite entry for adjustment #
              {target.action.sequence} (
              {formatStockQuantity(target.action.movements[0].quantityDelta)}{' '}
              {product.unit}). The original stays in your history.
            </p>
          )}
          {(validation || mutation.error) && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {validation || (mutation.error && stockError(mutation.error))}
            </p>
          )}
          <fieldset disabled={mutation.isPending} className="space-y-4">
            {target.type === 'adjustment' && (
              <label className="block text-sm font-medium text-slate-700">
                Change
                <select
                  className={control}
                  value={direction}
                  onChange={event =>
                    setDirection(event.target.value as 'IN' | 'OUT')
                  }
                >
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                </select>
              </label>
            )}
            {target.type !== 'reversal' && (
              <label className="block text-sm font-medium text-slate-700">
                {target.type === 'opening' ? 'Opening quantity' : 'Quantity'}
                <input
                  className={control}
                  value={quantity}
                  onChange={event => setQuantity(event.target.value)}
                  inputMode="decimal"
                  maxLength={19}
                  placeholder="0.000"
                  autoFocus
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  In {product.unit} · up to 3 decimal places
                </span>
              </label>
            )}
            <label className="block text-sm font-medium text-slate-700">
              Effective date
              <input
                className={control}
                type="date"
                value={effectiveDate}
                onChange={event => setEffectiveDate(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Reason
              <textarea
                className={control}
                value={reason}
                onChange={event => setReason(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder={
                  target.type === 'opening'
                    ? 'Opening stock count'
                    : 'Why is stock changing?'
                }
              />
            </label>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={close}
            >
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {target.type === 'opening'
                ? 'Start tracking'
                : target.type === 'reversal'
                  ? 'Confirm reversal'
                  : 'Save adjustment'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
