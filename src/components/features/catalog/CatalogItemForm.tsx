import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CatalogItem, CatalogItemInput } from '../../../types/catalog'
import { useSaveCatalogItem } from '../../../hooks/useCatalog'
import { SUPPORTED_CURRENCIES } from '../../../services/invoiceCalculation.service'
import { Button } from '../../ui/Button'

const schema = z.object({
  type: z.enum(['product', 'service']),
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(250),
  sku: z.string().trim().max(100).nullable(),
  unit: z.string().trim().min(1, 'Unit is required').max(50),
  rate: z.number().min(0, 'Price must be non-negative').max(100000),
  currency: z
    .string()
    .refine(
      value => SUPPORTED_CURRENCIES.includes(value),
      'Select a supported currency'
    ),
})

export function CatalogItemForm({
  item,
  currency = 'USD',
  onSaved,
  onCancel,
}: {
  item?: CatalogItem
  currency?: string
  onSaved: (item: CatalogItem) => void
  onCancel: () => void
}) {
  const identityLocked = !!(item?.usedAt || item?.stockTrackingStartedAt)
  const save = useSaveCatalogItem()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CatalogItemInput>({
    resolver: zodResolver(schema),
    defaultValues: item ?? {
      type: 'product',
      name: '',
      description: '',
      sku: '',
      unit: 'each',
      rate: 0,
      currency,
    },
  })
  const input =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100'
  return (
    <form
      onSubmit={event => {
        event.stopPropagation()
        void handleSubmit(async data => {
          try {
            onSaved(
              await save.mutateAsync({
                id: item?.id,
                data: { ...data, sku: data.sku?.trim().toUpperCase() || null },
              })
            )
          } catch {
            /* The mutation error stays visible and inputs remain intact. */
          }
        })(event)
      }}
      className="space-y-4"
    >
      {save.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {save.error.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Type
          <select
            {...register('type')}
            disabled={identityLocked}
            className={input}
          >
            <option value="product">Product</option>
            <option value="service">Service</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Unit
          <input
            {...register('unit')}
            readOnly={identityLocked}
            maxLength={50}
            className={input}
            placeholder="each, hour, project…"
          />
          {errors.unit && (
            <span role="alert" className="text-xs text-red-600">
              {errors.unit.message}
            </span>
          )}
        </label>
      </div>
      {identityLocked && (
        <p className="text-xs text-slate-500">
          Type and unit are fixed once an item is used or stock tracking starts.
        </p>
      )}
      <label className="block text-sm font-medium text-slate-700">
        Name
        <input
          {...register('name')}
          maxLength={200}
          className={input}
          autoFocus
        />
        {errors.name && (
          <span role="alert" className="text-xs text-red-600">
            {errors.name.message}
          </span>
        )}
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Description{' '}
        <span className="font-normal text-slate-400">(optional)</span>
        <textarea
          {...register('description')}
          maxLength={250}
          rows={2}
          className={input}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        SKU <span className="font-normal text-slate-400">(optional)</span>
        <input
          {...register('sku')}
          maxLength={100}
          className={input}
          placeholder="A unique item reference"
        />
        {errors.sku && (
          <span role="alert" className="text-xs text-red-600">
            {errors.sku.message}
          </span>
        )}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Selling price
          <input
            {...register('rate', { valueAsNumber: true })}
            type="number"
            min="0"
            max="100000"
            step="any"
            className={input}
          />
          {errors.rate && (
            <span role="alert" className="text-xs text-red-600">
              {errors.rate.message}
            </span>
          )}
        </label>
        <label className="text-sm font-medium text-slate-700">
          Currency
          <select {...register('currency')} className={input}>
            {SUPPORTED_CURRENCIES.map(code => (
              <option key={code}>{code}</option>
            ))}
          </select>
          {errors.currency && (
            <span role="alert" className="text-xs text-red-600">
              {errors.currency.message}
            </span>
          )}
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Prices are before invoice tax. Changes apply to future selections; saved
        invoice values stay intact.
      </p>
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={save.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {item ? 'Save changes' : 'Create item'}
        </Button>
      </div>
    </form>
  )
}
