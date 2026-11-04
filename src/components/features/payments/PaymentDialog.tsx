import { useState } from 'react'
import { usePaymentInvoice, useRecordPayment } from '../../../hooks/usePayments'
import type {
  PaymentCommand,
  PaymentEntry,
  PaymentInvoice,
  PaymentResult,
} from '../../../types/payments'
import { canRecordPayment, formatPayment } from '../../../types/payments'
import { formatDateForInput } from '../../../utils/formatters'
import { ApiError } from '../../../services/api/apiClient'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { PaymentInvoicePicker } from './PaymentInvoicePicker'

export type PaymentTarget =
  | { type: 'record'; invoiceId?: string }
  | { type: 'reversal'; entry: PaymentEntry }
function paymentError(error: Error) {
  if (error.message.includes('request ID'))
    return 'An earlier attempt was saved with different details. Close this form and review the timeline before adding another payment.'
  if (error instanceof ApiError) {
    const details = (
      error.data as
        | { details?: { balance?: string; currency?: string } }
        | undefined
    )?.details
    if (details?.balance !== undefined)
      return `${error.message} Current balance: ${formatPayment(details.balance, details.currency ?? 'INR')}.`
  }
  return error.message
}

export function PaymentDialog({
  target,
  onClose,
  onSaved,
}: {
  target: PaymentTarget
  onClose: () => void
  onSaved: (result: PaymentResult) => void
}) {
  const [invoiceId, setInvoiceId] = useState(
    target.type === 'record'
      ? (target.invoiceId ?? '')
      : target.entry.invoice.id
  )
  const query = usePaymentInvoice(invoiceId)
  const mutation = useRecordPayment()
  const close = () => {
    if (!mutation.isPending) onClose()
  }
  return (
    <Modal
      open
      onClose={close}
      title={
        target.type === 'record'
          ? 'Record UPI payment'
          : 'Reverse payment entry'
      }
    >
      {!invoiceId ? (
        <PaymentInvoicePicker onSelect={setInvoiceId} />
      ) : (
        <>
          {query.isPending && <p role="status">Loading invoice balance…</p>}
          {query.error && (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {query.error.message}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void query.refetch()}
              >
                Try again
              </button>
            </p>
          )}
          {query.data && (
            <PaymentFields
              key={invoiceId}
              invoice={query.data}
              target={target}
              mutation={mutation}
              onClose={close}
              onSaved={onSaved}
            />
          )}
        </>
      )}
    </Modal>
  )
}

function PaymentFields({
  invoice,
  target,
  mutation,
  onClose,
  onSaved,
}: {
  invoice: PaymentInvoice
  target: PaymentTarget
  mutation: ReturnType<typeof useRecordPayment>
  onClose: () => void
  onSaved: (result: PaymentResult) => void
}) {
  const [requestId] = useState(() => crypto.randomUUID())
  const [amount, setAmount] = useState(invoice.balance)
  const [paymentDate, setPaymentDate] = useState(formatDateForInput(new Date()))
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [validation, setValidation] = useState('')
  const [hasAttempted, setHasAttempted] = useState(false)
  const isRecord = target.type === 'record'
  const eligible = isRecord
    ? canRecordPayment(invoice)
    : invoice.status !== 'VOIDED'
  const control =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50'
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        if (mutation.isPending || (!eligible && !hasAttempted)) return
        if (
          isRecord &&
          (!/^\d{1,14}(?:\.\d{1,2})?$/.test(amount) || !/[1-9]/.test(amount))
        ) {
          setValidation(
            'Enter a positive INR amount with up to two decimal places.'
          )
          return
        }
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) ||
          !Number.isFinite(Date.parse(paymentDate)) ||
          new Date(paymentDate).toISOString().slice(0, 10) !== paymentDate
        ) {
          setValidation('Enter a valid payment or correction date.')
          return
        }
        if (!isRecord && !notes.trim()) {
          setValidation('Enter a reason for reversing this entry.')
          return
        }
        setValidation('')
        setHasAttempted(true)
        const data = { requestId, paymentDate }
        const command: PaymentCommand =
          target.type === 'record'
            ? {
                type: 'record',
                invoiceId: invoice.id,
                data: {
                  ...data,
                  amount,
                  reference: reference.trim(),
                  notes: notes.trim(),
                },
              }
            : {
                type: 'reversal',
                entryId: target.entry.id,
                data: { ...data, reason: notes.trim() },
              }
        mutation.mutate(command, { onSuccess: onSaved })
      }}
    >
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="break-words font-semibold text-slate-900">
          {invoice.invoiceNumber}
        </p>
        <p className="mt-1 break-words text-sm text-slate-600">
          Current balance: {formatPayment(invoice.balance, invoice.currency)}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">
        {target.type === 'record'
          ? 'Confirm a UPI payment you have already received. This is an owner-recorded receipt, not a gateway verification or a money transfer.'
          : `Reverse the full ${formatPayment(target.entry.amount, target.entry.currency)} entry #${target.entry.sequence}. Its original stays in history. This corrects bookkeeping; it does not send a refund or change stock.`}
      </p>
      {!eligible && (
        <p className="text-sm text-amber-700">
          {isRecord
            ? 'Only issued INR invoices with a positive balance can receive new UPI records.'
            : 'A voided invoice cannot receive payment corrections.'}{' '}
          {hasAttempted &&
            'You can retry the earlier attempt safely or close this form to review history.'}
        </p>
      )}
      {(validation || mutation.error) && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {validation || (mutation.error && paymentError(mutation.error))}
        </p>
      )}
      <fieldset disabled={mutation.isPending} className="space-y-4">
        {isRecord && (
          <label className="block text-sm font-medium text-slate-700">
            Amount received (INR)
            <input
              autoFocus
              inputMode="decimal"
              className={control}
              value={amount}
              maxLength={17}
              onChange={event => setAmount(event.target.value)}
            />
          </label>
        )}
        <label className="block text-sm font-medium text-slate-700">
          {isRecord ? 'Payment date' : 'Correction date'}
          <input
            type="date"
            className={control}
            value={paymentDate}
            onChange={event => setPaymentDate(event.target.value)}
          />
        </label>
        {isRecord && (
          <label className="block text-sm font-medium text-slate-700">
            UPI transaction reference{' '}
            <span className="font-normal text-slate-400">(optional)</span>
            <input
              className={control}
              value={reference}
              maxLength={100}
              onChange={event => setReference(event.target.value)}
            />
          </label>
        )}
        <label className="block text-sm font-medium text-slate-700">
          {isRecord ? 'Notes (optional)' : 'Reason'}
          <textarea
            className={control}
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={event => setNotes(event.target.value)}
          />
        </label>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={mutation.isPending}
          disabled={!eligible && !hasAttempted}
        >
          {isRecord ? 'Save payment' : 'Confirm reversal'}
        </Button>
      </div>
    </form>
  )
}
