import { useState } from 'react'
import type {
  RazorpayMode,
  RazorpaySetupConnection,
} from '../../../types/razorpay'
import { ENV } from '../../../utils/env'
import { Button } from '../../ui/Button'

export function RazorpaySetupGuide({
  mode,
  connection,
}: {
  mode: RazorpayMode
  connection?: RazorpaySetupConnection
}) {
  const label = mode === 'TEST' ? 'Test' : 'Live'
  const [copyMessage, setCopyMessage] = useState('')
  const endpoint = connection?.webhookPath
    ? new URL(connection.webhookPath, ENV.API_BASE_URL)
    : null
  const hostedEndpoint =
    endpoint?.protocol === 'https:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
  const receipt = connection?.lastWebhook
  const steps = [
    {
      title: 'Connect API keys',
      complete: !!connection?.enabled,
      detail: connection?.enabled
        ? 'API access is verified for this mode.'
        : connection
          ? 'Saved keys are disabled. Verify and enable them below.'
          : 'Enter this mode’s Key ID and Key Secret below.',
    },
    {
      title: 'Save the webhook secret',
      complete: !!connection?.hasWebhookSecret,
      detail: connection?.hasWebhookSecret
        ? 'A secret is saved in Invoiceo. Use the same value in Razorpay.'
        : 'After connecting, save the same webhook secret here and in Razorpay.',
    },
    {
      title: 'Receive a signed webhook',
      complete: !!receipt,
      detail: receipt
        ? 'A signed callback has reached Invoiceo. Its latest receipt is shown below.'
        : 'No signed webhook received yet. Configure it in Razorpay, then refresh setup status.',
    },
  ]

  const copy = async () => {
    if (!endpoint) return
    try {
      await navigator.clipboard.writeText(endpoint.href)
      setCopyMessage('Webhook URL copied.')
    } catch {
      setCopyMessage('Copy the webhook URL from the field above.')
    }
  }

  return (
    <section
      aria-label={`${label} setup checklist`}
      className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <h3 className="font-semibold text-slate-800">Setup checklist</h3>
      <ol className="mt-3 space-y-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3 text-sm">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${step.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-slate-800">
                {step.title}{' '}
                <span className="text-xs font-normal text-slate-500">
                  — {step.complete ? 'Complete' : 'Pending'}
                </span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {endpoint && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <label className="block text-sm font-medium text-slate-700">
            {label} webhook URL
            <input
              type="url"
              readOnly
              value={endpoint.href}
              onFocus={event => event.target.select()}
              className="mt-2 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </label>
          <Button
            type="button"
            size="small"
            variant="outline"
            disabled={!hostedEndpoint}
            onClick={() => void copy()}
            className="mt-2"
          >
            Copy {label} webhook URL
          </Button>
          {!hostedEndpoint && (
            <p className="mt-2 text-xs text-amber-800">
              Razorpay needs a public HTTPS endpoint. Use your deployed backend
              for webhook delivery; this local or HTTP address is unsuitable.
            </p>
          )}
          {copyMessage && (
            <p role="status" className="mt-2 text-xs text-slate-600">
              {copyMessage}
            </p>
          )}
        </div>
      )}
      {receipt && (
        <div className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">
            Last signed webhook received
          </p>
          <time dateTime={receipt.receivedAt} className="mt-1 block">
            {new Date(receipt.receivedAt).toLocaleString()}
          </time>
          <p className="mt-1 break-all font-mono">{receipt.event}</p>
          <p className="mt-1">
            {receipt.outcome === 'SYNCED'
              ? 'Processed for a payment link.'
              : 'Received without invoice changes.'}
          </p>
        </div>
      )}
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        A receipt confirms a signed callback was accepted at that time. It does
        not verify every event setting, a later secret change, Live checkout or
        bank settlement.
      </p>
    </section>
  )
}
