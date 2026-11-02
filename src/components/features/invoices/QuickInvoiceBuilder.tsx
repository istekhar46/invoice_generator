import React, { useEffect, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Check,
  Download,
  ImagePlus,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { quickInvoiceSchema } from '../../../types/forms'
import type { QuickInvoiceFormData } from '../../../types/forms'
import type { GuestInvoiceData } from '../../../types/guest'
import type { Invoice } from '../../../types/entities'
import {
  pickInvoiceDefaults,
  type InvoiceDefaults,
  type NewInvoiceDefaults,
} from '../../../types/invoiceDefaults'
import {
  useCreateQuickInvoice,
  useUpdateInvoice,
} from '../../../hooks/useInvoices'
import {
  calculateInvoiceForEdit,
  invoicePricingChanged,
  currencyDigits,
  money,
  SUPPORTED_CURRENCIES,
} from '../../../services/invoiceCalculation.service'
import {
  clearLocalStorage,
  saveToLocalStorage,
} from '../../../utils/guestInvoiceStorage'
import { generateAndDownloadPDF } from '../../../utils/guestPDFGeneration'
import {
  guestDocument,
  invoiceOptions,
  toGuestInvoiceData,
} from '../../../utils/invoiceDocument'
import { downloadInvoicePDF } from '../../../services/pdf/pdfGenerator.service'
import {
  transformInvoiceResponse,
  transformLineItemToDto,
} from '../../../utils/apiTransformers'
import { formatCurrency, formatDateForInput } from '../../../utils/formatters'

export interface QuickInvoiceBuilderProps {
  invoice?: Invoice | null
  onSave?: (invoice: Invoice) => void
  initialGuestData?: GuestInvoiceData | null
  mode?: 'authenticated' | 'guest'
  autoSaveImportedDraft?: boolean
  onSignUp?: () => void
  className?: string
  initialDefaults?: NewInvoiceDefaults
  onSaveDefaults?: (settings: InvoiceDefaults) => Promise<unknown>
  onStartNew?: () => void
}

const newItem = () => ({
  id: crypto.randomUUID(),
  type: 'material' as const,
  description: '',
  unit: 'each',
  quantity: 1,
  rate: 0,
  amount: 0,
})
const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' })

function initialValues(
  invoice?: Invoice | null,
  draft?: GuestInvoiceData | null,
  defaults?: NewInvoiceDefaults
): QuickInvoiceFormData {
  const today = new Date()
  const due = new Date(today)
  due.setDate(due.getDate() + 30)
  const company = !invoice && !draft ? defaults?.company : null
  return {
    ...invoiceOptions(
      invoice || draft?.invoiceDetails || defaults?.settings || {}
    ),
    logoDataUrl:
      invoice || draft
        ? (invoice?.logoDataUrl ?? draft?.invoiceDetails.logoDataUrl ?? '')
        : (defaults?.logoDataUrl ?? ''),
    invoiceNumber:
      invoice?.invoiceNumber || draft?.invoiceDetails.invoiceNumber || '',
    customerId: invoice?.customerId || '',
    quickCompanyName:
      invoice?.quickCompanyName ||
      draft?.company?.businessName ||
      company?.businessName ||
      '',
    quickCompanyAddress:
      invoice?.quickCompanyAddress ||
      draft?.company?.address ||
      company?.address ||
      '',
    quickCompanyCity:
      invoice?.quickCompanyCity || draft?.company?.city || company?.city || '',
    quickCompanyState:
      invoice?.quickCompanyState ||
      draft?.company?.state ||
      company?.state ||
      '',
    quickCompanyZipCode:
      invoice?.quickCompanyZipCode ||
      draft?.company?.zipCode ||
      company?.zipCode ||
      '',
    quickCompanyPhone:
      invoice?.quickCompanyPhone ||
      draft?.company?.phone ||
      company?.phone ||
      '',
    quickCompanyEmail:
      invoice?.quickCompanyEmail ||
      draft?.company?.email ||
      company?.email ||
      '',
    quickCompanyTaxNumber:
      invoice?.quickCompanyTaxNumber ||
      draft?.company?.taxNumber ||
      company?.taxNumber ||
      '',
    quickCustomerName:
      invoice?.quickCustomerName ||
      invoice?.customer?.name ||
      draft?.customer.name ||
      '',
    quickCustomerAddress:
      invoice?.quickCustomerAddress ||
      invoice?.customer?.address ||
      draft?.customer.address ||
      '',
    quickCustomerCity:
      invoice?.quickCustomerCity ||
      invoice?.customer?.city ||
      draft?.customer.city ||
      '',
    quickCustomerState:
      invoice?.quickCustomerState ||
      invoice?.customer?.state ||
      draft?.customer.state ||
      '',
    quickCustomerZipCode:
      invoice?.quickCustomerZipCode ||
      invoice?.customer?.zipCode ||
      draft?.customer.zipCode ||
      '',
    quickCustomerPhone:
      invoice?.quickCustomerPhone ||
      invoice?.customer?.phone ||
      draft?.customer.phone ||
      '',
    quickCustomerEmail:
      invoice?.quickCustomerEmail ||
      invoice?.customer?.email ||
      draft?.customer.email ||
      '',
    serviceDate:
      invoice?.serviceDate || draft?.invoiceDetails.serviceDate || today,
    dueDate: invoice?.dueDate || draft?.invoiceDetails.dueDate || due,
    taxRate:
      invoice?.taxRate ??
      draft?.invoiceDetails.taxRate ??
      defaults?.settings.taxRate ??
      0,
    notes:
      invoice?.notes ??
      draft?.notes ??
      (!invoice && !draft ? defaults?.settings.notes : '') ??
      '',
    lineItems: invoice?.lineItems || draft?.lineItems || [newItem()],
  }
}

export const QuickInvoiceBuilder: React.FC<QuickInvoiceBuilderProps> = ({
  invoice,
  initialGuestData,
  onSave,
  mode = 'authenticated',
  autoSaveImportedDraft = false,
  onSignUp,
  className = '',
  initialDefaults,
  onSaveDefaults,
  onStartNew,
}) => {
  const isGuest = mode === 'guest'
  const [savedInvoice, setSavedInvoice] = useState(invoice ?? undefined)
  const savedId = savedInvoice?.id
  const [draftId, setDraftId] = useState(
    () => initialGuestData?.draftId || crypto.randomUUID()
  )
  const [createdAt, setCreatedAt] = useState(
    () => initialGuestData?.createdAt || new Date()
  )
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [draftStatus, setDraftStatus] = useState(
    initialGuestData
      ? 'Draft restored in this browser'
      : 'Drafts stay in this browser'
  )
  const [downloading, setDownloading] = useState(false)
  const [savingDefaults, setSavingDefaults] = useState(false)
  const autoSaveAttempted = useRef(false)
  const createInvoice = useCreateQuickInvoice()
  const updateInvoice = useUpdateInvoice()
  const [defaultValues] = useState(() =>
    initialValues(invoice, initialGuestData, initialDefaults)
  )
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm<QuickInvoiceFormData>({
    resolver: zodResolver(quickInvoiceSchema),
    defaultValues,
    mode: 'onBlur',
  })
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  })
  const values = useWatch({ control }) as QuickInvoiceFormData
  const busy =
    downloading ||
    savingDefaults ||
    createInvoice.isPending ||
    updateInvoice.isPending
  const currency = values.currency || 'USD'
  const step = 10 ** -currencyDigits(currency)
  let calculationError = ''
  let totals: ReturnType<typeof calculateInvoiceForEdit> | undefined
  try {
    totals = calculateInvoiceForEdit(
      values.lineItems || [],
      values.taxRate,
      values,
      savedInvoice
    )
  } catch (err) {
    calculationError =
      err instanceof Error ? err.message : 'Check invoice amounts.'
  }
  const display = (value?: number) =>
    value === undefined ? '—' : formatCurrency(value, currency)

  useEffect(() => {
    if (!isGuest || !isDirty) return
    const timer = window.setTimeout(() => {
      try {
        saveToLocalStorage(toGuestInvoiceData(getValues(), draftId, createdAt))
        setDraftStatus('Draft saved in this browser')
      } catch (err) {
        setDraftStatus(
          `Draft not saved: ${err instanceof Error ? err.message : 'Browser storage is unavailable.'}`
        )
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [isGuest, isDirty, values, draftId, createdAt, getValues])

  const save = async (data: QuickInvoiceFormData) => {
    setError('')
    setMessage('')
    try {
      calculateInvoiceForEdit(data.lineItems, data.taxRate, data, savedInvoice)
      const payload = {
        ...data,
        customerId: data.customerId || undefined,
        lineItems: data.lineItems.map(transformLineItemToDto),
      }
      const result = savedId
        ? await updateInvoice.mutateAsync({ id: savedId, data: payload })
        : await createInvoice.mutateAsync({
            ...payload,
            isQuickInvoice: true,
            clientRequestId: draftId,
          })
      const saved = transformInvoiceResponse(result)
      setSavedInvoice(saved)
      setValue('invoiceNumber', saved.invoiceNumber)
      setMessage(`Invoice ${saved.invoiceNumber} saved.`)
      if (initialGuestData) {
        try {
          clearLocalStorage()
        } catch {
          setError('Invoice saved, but the browser draft could not be cleared.')
        }
      }
      onSave?.(saved)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invoice could not be saved. Please try again.'
      )
    }
  }
  const importSubmit = useRef<() => Promise<void>>(async () => undefined)
  importSubmit.current = handleSubmit(save)
  useEffect(() => {
    if (
      isGuest ||
      !autoSaveImportedDraft ||
      !initialGuestData ||
      autoSaveAttempted.current
    )
      return
    autoSaveAttempted.current = true
    void importSubmit.current()
  }, [isGuest, autoSaveImportedDraft, initialGuestData])

  const download = async (data: QuickInvoiceFormData) => {
    setError('')
    setDownloading(true)
    try {
      calculateInvoiceForEdit(data.lineItems, data.taxRate, data, savedInvoice)
      const invoiceNumber =
        data.invoiceNumber?.trim() || `INV-${crypto.randomUUID()}`
      setValue('invoiceNumber', invoiceNumber, { shouldDirty: true })
      const guestData = toGuestInvoiceData(
        { ...data, invoiceNumber },
        draftId,
        createdAt
      )
      if (isGuest) {
        try {
          saveToLocalStorage(guestData)
        } catch {
          setError(
            'The PDF can be downloaded, but this browser could not save your draft.'
          )
        }
      }
      if (savedInvoice) {
        await downloadInvoicePDF(
          guestDocument(guestData, invoiceNumber, savedInvoice),
          null,
          null
        )
      } else {
        await generateAndDownloadPDF(guestData, invoiceNumber)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'PDF could not be downloaded. Please try again.'
      )
    } finally {
      setDownloading(false)
    }
  }
  const startNew = () => {
    if (onStartNew) {
      onStartNew()
      return
    }
    try {
      if (isGuest) clearLocalStorage()
      reset(initialValues(undefined, undefined, initialDefaults))
      setSavedInvoice(undefined)
      setDraftId(crypto.randomUUID())
      setCreatedAt(new Date())
      setMessage('')
      setError('')
      setDraftStatus('Draft cleared')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Draft could not be cleared.'
      )
    }
  }
  const signUp = () => {
    try {
      saveToLocalStorage(toGuestInvoiceData(getValues(), draftId, createdAt))
      onSignUp?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft could not be saved.')
    }
  }
  const saveDefaults = async () => {
    if (!onSaveDefaults) return
    setError('')
    setMessage('')
    setSavingDefaults(true)
    try {
      const settings = pickInvoiceDefaults(getValues())
      await onSaveDefaults(settings)
      setMessage('Invoice defaults saved for new invoices.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invoice defaults could not be saved.'
      )
    } finally {
      setSavingDefaults(false)
    }
  }
  const uploadLogo = async (file?: File) => {
    if (!file) return
    setError('')
    if (
      !['image/png', 'image/jpeg'].includes(file.type) ||
      file.size > 256 * 1024
    ) {
      setError('Choose a PNG or JPEG logo smaller than 256 KB.')
      return
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Logo could not be read.'))
        reader.readAsDataURL(file)
      })
      await new Promise<void>((resolve, reject) => {
        const image = new Image()
        image.onload = () =>
          image.width <= 4096 && image.height <= 4096
            ? resolve()
            : reject(new Error('Logo must be at most 4096 × 4096 pixels.'))
        image.onerror = () =>
          reject(
            new Error(
              'This image could not be opened. Choose another PNG or JPEG.'
            )
          )
        image.src = dataUrl
      })
      setValue('logoDataUrl', dataUrl, {
        shouldDirty: true,
        shouldValidate: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo could not be loaded.')
    }
  }
  const field = (
    name: FieldPath<QuickInvoiceFormData>,
    label: string,
    placeholder = '',
    multiline = false
  ) => (
    <label className="qi-field" key={name}>
      <span>{label}</span>
      {multiline ? (
        <textarea {...register(name)} placeholder={placeholder} rows={3} />
      ) : (
        <input {...register(name)} placeholder={placeholder} />
      )}
    </label>
  )
  const dateField = (name: 'serviceDate' | 'dueDate', label: string) => (
    <Controller
      name={name}
      control={control}
      render={({ field: input }) => (
        <label className="qi-field">
          <span>{label}</span>
          <input
            type="date"
            value={
              input.value && Number.isFinite(input.value.getTime())
                ? formatDateForInput(input.value)
                : ''
            }
            onBlur={input.onBlur}
            ref={input.ref}
            onChange={event =>
              input.onChange(new Date(`${event.target.value}T00:00:00`))
            }
          />
        </label>
      )}
    />
  )
  const numeric = {
    setValueAs: (value: string) => (value === '' ? 0 : Number(value)),
  }
  const validationMessages = Array.from(new Set(flattenErrors(errors)))

  return (
    <div className={`quick-invoice ${className}`}>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
            Invoiceo · Invoice studio
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your work. Ready to invoice.
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Fill it in, make it yours, and download a professional PDF.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          <ShieldCheck size={14} />{' '}
          {isGuest ? 'No account needed' : 'Save to your account'}
        </span>
      </div>
      <form
        noValidate
        onSubmit={handleSubmit(isGuest ? download : save)}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_240px]"
      >
        <fieldset
          disabled={busy}
          className="qi-sheet min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10"
        >
          <legend className="sr-only">Invoice details</legend>
          <div className="mb-9 flex flex-wrap items-start justify-between gap-6">
            <div className="relative">
              <label className="qi-logo flex h-28 w-44 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-500 hover:border-primary-400">
                {values.logoDataUrl ? (
                  <img
                    className="h-full w-full object-contain p-2"
                    src={values.logoDataUrl}
                    alt="Your company logo"
                  />
                ) : (
                  <>
                    <ImagePlus size={23} />
                    <span>Add your logo</span>
                    <small className="text-[10px] font-normal">
                      PNG or JPEG · up to 256 KB
                    </small>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  aria-label="Upload company logo"
                  className="sr-only"
                  onChange={event => {
                    void uploadLogo(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>
              {values.logoDataUrl && (
                <button
                  type="button"
                  aria-label="Remove logo"
                  className="absolute -right-2 -top-2 rounded-full border bg-white p-1 text-slate-500"
                  onClick={() =>
                    setValue('logoDataUrl', '', { shouldDirty: true })
                  }
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="w-full max-w-60 sm:text-right">
              <p className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                INVOICE
              </p>
              <div className="mt-4">
                {field(
                  'invoiceNumber',
                  'Invoice number',
                  'Auto-generated when blank'
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-7 xl:grid-cols-[1.1fr_1fr]">
            <div className="space-y-5">
              <div className="space-y-3">
                {field('quickCompanyName', 'From', 'Your business name')}
                {field(
                  'quickCompanyAddress',
                  'Business address',
                  'Street address',
                  true
                )}
              </div>
              <details className="qi-details">
                <summary>Business contact & tax details</summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {field('quickCompanyCity', 'City')}
                  {field('quickCompanyState', 'State / region')}
                  {field('quickCompanyZipCode', 'Postal code')}
                  {field('quickCompanyTaxNumber', 'Tax / VAT / GST ID')}
                  {field('quickCompanyEmail', 'Business email')}
                  {field('quickCompanyPhone', 'Business phone')}
                </div>
              </details>
            </div>
            <div className="grid grid-cols-2 content-start gap-3">
              {dateField('serviceDate', 'Invoice date')}
              {dateField('dueDate', 'Due date')}
              {field('paymentTerms', 'Payment terms', 'e.g. Net 30')}
              {field('purchaseOrderNumber', 'PO number', 'Optional reference')}
            </div>
          </div>
          <div className="my-7 grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              {field(
                'quickCustomerName',
                'Bill to *',
                'Customer or business name'
              )}
              {field(
                'quickCustomerAddress',
                'Billing address',
                'Street address',
                true
              )}
              <details className="qi-details mt-3">
                <summary>Customer contact details</summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {field('quickCustomerCity', 'Customer city')}
                  {field('quickCustomerState', 'Customer state / region')}
                  {field('quickCustomerZipCode', 'Customer postal code')}
                  {field('quickCustomerEmail', 'Customer email')}
                  {field('quickCustomerPhone', 'Customer phone')}
                </div>
              </details>
            </div>
            <div>
              {field(
                'shippingAddress',
                'Ship to',
                'Shipping address (optional)',
                true
              )}
            </div>
          </div>
          <div
            className="hidden grid-cols-[minmax(0,1fr)_64px_72px_100px_100px_28px] gap-3 rounded-lg bg-slate-900 px-3 py-3 text-xs font-medium text-white xl:grid"
            aria-hidden="true"
          >
            <span>Item / service</span>
            <span>Unit</span>
            <span>Qty</span>
            <span>Rate</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          <div className="divide-y divide-slate-100">
            {fields.map((item, index) => {
              const value = values.lineItems?.[index]
              let amount: number | undefined
              try {
                if (value)
                  amount =
                    savedInvoice &&
                    !invoicePricingChanged(
                      values.lineItems,
                      values.taxRate,
                      values,
                      savedInvoice
                    )
                      ? savedInvoice.lineItems[index].amount
                      : money(value.quantity * value.rate, currency)
              } catch {
                /* Invalid amounts are explained in the totals panel. */
              }
              return (
                <div
                  key={item.id}
                  className="grid min-w-0 grid-cols-2 items-end gap-3 py-4 xl:grid-cols-[minmax(0,1fr)_64px_72px_100px_100px_28px]"
                >
                  <label className="qi-field col-span-2 xl:col-span-1">
                    <span className="xl:sr-only">
                      Item {index + 1} description *
                    </span>
                    <textarea
                      rows={2}
                      {...register(`lineItems.${index}.description`)}
                      placeholder="Describe your product or service"
                    />
                  </label>
                  <label className="qi-field">
                    <span className="xl:sr-only">Item {index + 1} unit *</span>
                    <input {...register(`lineItems.${index}.unit`)} />
                  </label>
                  <label className="qi-field">
                    <span className="xl:sr-only">
                      Item {index + 1} quantity *
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      {...register(`lineItems.${index}.quantity`, numeric)}
                    />
                  </label>
                  <label className="qi-field">
                    <span className="xl:sr-only">Item {index + 1} rate *</span>
                    <input
                      type="number"
                      min="0"
                      step={step}
                      {...register(`lineItems.${index}.rate`, numeric)}
                    />
                  </label>
                  <output
                    aria-label={`Item ${index + 1} amount`}
                    className="pb-3 text-right text-sm font-semibold text-slate-800"
                  >
                    {display(amount)}
                  </output>
                  <button
                    type="button"
                    aria-label={`Remove item ${index + 1}`}
                    className="col-start-2 justify-self-end rounded-lg p-2 text-slate-400 xl:col-start-auto hover:bg-red-50 hover:text-red-600"
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => append(newItem())}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary-200 bg-primary-50/40 py-3 text-sm font-medium text-primary-700 hover:bg-primary-50"
          >
            <Plus size={17} /> Add line item
          </button>
          <div className="mt-9 grid gap-8 xl:grid-cols-2">
            <div className="space-y-5">
              {field(
                'notes',
                'Notes',
                'A thank-you or details about your work',
                true
              )}
              {field(
                'terms',
                'Terms & payment instructions',
                'Bank details, accepted payment methods, or other terms',
                true
              )}
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <output aria-label="Subtotal" className="font-medium">
                  {display(totals?.subtotal)}
                </output>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_92px] sm:grid-cols-[minmax(0,1fr)_92px_100px] items-end gap-2">
                <label className="qi-field">
                  <span>Discount</span>
                  <select
                    aria-label="Discount type"
                    {...register('discountType')}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed ({currency})</option>
                  </select>
                </label>
                <label className="qi-field">
                  <span className="sr-only">Discount value</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    {...register('discountValue', numeric)}
                  />
                </label>
                <output
                  aria-label="Discount amount"
                  className="col-span-2 pb-3 text-right text-slate-500 sm:col-span-1"
                >
                  −{display(totals?.discountAmount)}
                </output>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Controller
                  name="taxRate"
                  control={control}
                  render={({ field: input }) => (
                    <label className="qi-field max-w-36">
                      <span>Tax (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={
                          Number.isFinite(input.value)
                            ? Number((input.value * 100).toFixed(6))
                            : ''
                        }
                        onBlur={input.onBlur}
                        ref={input.ref}
                        onChange={event =>
                          input.onChange(Number(event.target.value) / 100)
                        }
                      />
                    </label>
                  )}
                />
                <output aria-label="Tax amount" className="pt-5">
                  {display(totals?.taxAmount)}
                </output>
              </div>
              <label className="qi-field qi-inline">
                <span>Shipping ({currency})</span>
                <input
                  className="max-w-36 text-right"
                  type="number"
                  min="0"
                  step={step}
                  {...register('shippingAmount', numeric)}
                />
              </label>
              <div className="flex justify-between border-t border-slate-200 pt-4 text-base font-bold">
                <span>Total</span>
                <output aria-label="Invoice total">
                  {display(totals?.total)}
                </output>
              </div>
              <label className="qi-field qi-inline">
                <span>Amount paid ({currency})</span>
                <input
                  className="max-w-36 text-right"
                  type="number"
                  min="0"
                  max={totals?.total}
                  step={step}
                  {...register('amountPaid', numeric)}
                />
              </label>
              <div className="flex justify-between rounded-xl bg-primary-50 p-4 text-base font-bold text-primary-800">
                <span>Balance due</span>
                <output aria-label="Balance due">
                  {display(totals?.balanceDue)}
                </output>
              </div>
              {calculationError && (
                <p role="alert" className="text-sm text-red-600">
                  {calculationError}
                </p>
              )}
            </div>
          </div>
        </fieldset>
        <aside className="qi-actions space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Ready when you are
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {display(totals?.balanceDue)}
            </p>
            <p className="mb-5 mt-1 text-xs text-slate-400">
              Balance due · {currency}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={handleSubmit(download)}
              className="qi-primary"
            >
              <Download size={17} />
              {downloading ? 'Preparing PDF…' : 'Download PDF'}
            </button>
            {!isGuest && (
              <button
                type="submit"
                disabled={busy}
                className="qi-secondary mt-3"
              >
                <Save size={17} />
                {createInvoice.isPending || updateInvoice.isPending
                  ? 'Saving…'
                  : 'Save Invoice'}
              </button>
            )}
            {isGuest && (
              <button
                type="button"
                disabled={busy}
                onClick={handleSubmit(signUp)}
                className="qi-secondary mt-3"
              >
                Sign Up to Save
              </button>
            )}
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              Review your details before sharing the PDF with your customer.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">
              Invoice settings
            </h3>
            <label className="qi-field">
              <span>Currency</span>
              <select aria-label="Currency" {...register('currency')}>
                {SUPPORTED_CURRENCIES.map(code => (
                  <option key={code} value={code}>
                    {code} — {currencyNames.of(code)}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Currency changes the denomination. Your prices are not converted.
            </p>
            {!isGuest && onSaveDefaults && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveDefaults()}
                  className="qi-secondary mt-4"
                >
                  {savingDefaults ? 'Saving defaults…' : 'Save as default'}
                </button>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  Saves currency, tax, payment terms, notes and terms for new
                  invoices. Business details and logo come from your company
                  profile.
                </p>
              </>
            )}
          </div>
          <div
            className="px-1 text-xs leading-relaxed text-slate-500"
            role="status"
          >
            {isGuest && (
              <span className="flex items-center gap-2">
                <ShieldCheck size={14} />
                {draftStatus}
              </span>
            )}
            {message && (
              <span className="mt-2 flex items-start gap-2 text-green-700">
                <Check size={15} className="shrink-0" />
                {message}
              </span>
            )}
          </div>
          {(error || validationMessages.length > 0) && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="font-semibold">Check your invoice</p>
              {error && <p className="mt-1">{error}</p>}
              {validationMessages.map(text => (
                <p key={text} className="mt-1">
                  {text}
                </p>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={startNew}
            className="flex items-center gap-2 px-2 py-2 text-xs text-slate-500 hover:text-red-600"
          >
            <Trash2 size={14} />
            {isGuest ? 'Clear Draft' : 'New invoice'}
          </button>
        </aside>
      </form>
    </div>
  )
}

function flattenErrors(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  if (typeof record.message === 'string') return [record.message]
  return Object.entries(record)
    .filter(([key]) => key !== 'ref')
    .flatMap(([, child]) => flattenErrors(child))
}
