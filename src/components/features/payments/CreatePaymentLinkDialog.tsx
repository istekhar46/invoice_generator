import { useState } from 'react'
import { useGatewayCommand } from '../../../hooks/useGateway'
import { usePaymentInvoice } from '../../../hooks/usePayments'
import type { GatewayLink, RazorpayMode } from '../../../types/razorpay'
import { canRecordPayment, formatPayment } from '../../../types/payments'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { PaymentInvoicePicker } from './PaymentInvoicePicker'

export function CreatePaymentLinkDialog({
  mode,
  initialInvoiceId,
  onClose,
  onSaved,
}: {
  mode: RazorpayMode
  initialInvoiceId?: string
  onClose: () => void
  onSaved: (link: GatewayLink) => void
}) {
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId ?? '')
  const [requestId] = useState(() => crypto.randomUUID())
  const invoice = usePaymentInvoice(invoiceId)
  const mutation = useGatewayCommand()
  const close = () => {
    if (!mutation.isPending) onClose()
  }
  return (
    <Modal
      open
      onClose={close}
      title={`Create ${mode === 'TEST' ? 'Test' : 'Live'} payment link`}
    >
      {mode === 'TEST' && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Test checkout simulates payment. It never changes the invoice balance
          or stock.
        </p>
      )}
      {!invoiceId ? (
        <PaymentInvoicePicker onSelect={setInvoiceId} />
      ) : (
        <>
          {invoice.isPending && <p role="status">Loading invoice balance…</p>}
          {invoice.error && (
            <p role="alert">
              {invoice.error.message}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void invoice.refetch()}
              >
                Retry invoice
              </button>
            </p>
          )}
          {invoice.data && (
            <form
              onSubmit={event => {
                event.preventDefault()
                if (!canRecordPayment(invoice.data) || mutation.isPending)
                  return
                mutation.mutate(
                  { type: 'create', invoiceId, mode, requestId },
                  { onSuccess: onSaved }
                )
              }}
            >
              <p className="break-words font-semibold">
                {invoice.data.invoiceNumber}
              </p>
              <p className="mt-2 text-sm">
                Balance due:{' '}
                {formatPayment(invoice.data.balance, invoice.data.currency)}
              </p>
              <p className="my-4 text-sm leading-relaxed text-slate-500">
                The link collects the full current balance by UPI. An active
                link is reused. No messages or reminders are sent automatically.
              </p>
              {!canRecordPayment(invoice.data) && (
                <p role="alert" className="mb-4 text-sm text-amber-800">
                  Choose a Sent INR invoice with a balance due.
                </p>
              )}
              {mutation.error && (
                <p role="alert" className="mb-4 text-sm text-red-700">
                  {mutation.error.message}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  loading={mutation.isPending}
                  disabled={
                    !canRecordPayment(invoice.data) || mutation.isPending
                  }
                >
                  Create link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={close}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </Modal>
  )
}
