import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { useRazorpaySetup } from '../hooks/useRazorpay'
import { razorpayApi } from '../services/api/razorpayApi'
import { queryKeys } from '../lib/queryKeys'
import type { RazorpayConnection, RazorpayMode } from '../types/razorpay'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'
import { Button } from '../components/ui/Button'

function ConnectionForm({
  mode,
  connection,
  available,
  refresh,
}: {
  mode: RazorpayMode
  connection?: RazorpayConnection
  available: boolean
  refresh: () => Promise<unknown>
}) {
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const label = mode === 'TEST' ? 'Test' : 'Live'
  async function run(action: () => Promise<unknown>, success: string) {
    if (pending) return
    setPending(true)
    setError('')
    setMessage('')
    try {
      await action()
      setKeyId('')
      setKeySecret('')
      setWebhookSecret('')
      setMessage(success)
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not update the connection. Please try again.'
      )
    } finally {
      // Cache only masked metadata. Credentials stay in this form and the
      // in-flight request; never put them in React Query mutation variables.
      await refresh()
      setPending(false)
    }
  }
  const input =
    'mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50'
  return (
    <section
      aria-label={`${label} Razorpay connection`}
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{label} mode</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${connection?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
        >
          {connection
            ? connection.enabled
              ? 'Connected'
              : 'Disabled'
            : 'Not connected'}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        {mode === 'TEST'
          ? 'Use Test API keys to prepare your integration. Simulated payments do not change real invoice balances or stock.'
          : 'Use your business’s own Live API keys. Razorpay account activation and payment-method availability are managed in Razorpay.'}
      </p>
      {connection && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="break-words font-mono text-slate-800">
            {connection.maskedKeyId}
          </p>
          <p className="mt-1 text-xs">
            API access checked{' '}
            {new Date(connection.validatedAt).toLocaleString()}
          </p>
          <p className="mt-2 text-xs">
            This check confirms API access; it does not confirm settlement or
            UPI checkout readiness.
          </p>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {message}
        </p>
      )}
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          if (pending || !available) return
          if (
            !new RegExp(`^rzp_${mode.toLowerCase()}_[A-Za-z0-9]+$`).test(
              keyId
            ) ||
            keyId.length > 120 ||
            !/^\S{1,256}$/.test(keySecret)
          ) {
            setMessage('')
            setError(
              `Enter valid ${label.toLowerCase()} API keys without spaces.`
            )
            return
          }
          void run(
            () => razorpayApi.save(mode, { keyId, keySecret }),
            `${label} credentials verified and saved.`
          )
        }}
      >
        <fieldset disabled={pending || !available} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            {label} Key ID
            <input
              className={input}
              value={keyId}
              maxLength={120}
              autoComplete="off"
              spellCheck={false}
              onChange={event => setKeyId(event.target.value)}
              placeholder={`rzp_${mode.toLowerCase()}_…`}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {label} Key Secret
            <input
              type="password"
              className={input}
              value={keySecret}
              maxLength={256}
              autoComplete="new-password"
              spellCheck={false}
              onChange={event => setKeySecret(event.target.value)}
            />
          </label>
          <p className="text-xs leading-relaxed text-slate-500">
            {connection
              ? 'To replace saved keys, enter both new values. A failed check keeps the saved connection.'
              : 'Find API keys under Account & Settings → API Keys in your Razorpay Dashboard.'}
          </p>
          <Button
            type="submit"
            loading={pending}
            disabled={pending || !available}
          >
            {connection ? 'Verify & replace keys' : 'Verify & connect'}
          </Button>
        </fieldset>
      </form>
      {connection && (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            size="small"
            disabled={pending || !available}
            onClick={() =>
              void run(
                () => razorpayApi.verify(mode),
                `${label} connection verified and enabled.`
              )
            }
          >
            Verify & enable saved keys
          </Button>
          {connection.enabled && (
            <Button
              type="button"
              variant="ghost"
              size="small"
              disabled={pending}
              onClick={() =>
                void run(
                  () => razorpayApi.disable(mode),
                  `${label} connection disabled.`
                )
              }
            >
              Disable connection
            </Button>
          )}
        </div>
      )}
      {connection && (
        <form
          className="mt-5 border-t border-slate-100 pt-5"
          onSubmit={event => {
            event.preventDefault()
            if (pending || !available) return
            if (!/^\S{16,256}$/.test(webhookSecret)) {
              setError(
                'Use a webhook secret with 16–256 characters and no spaces.'
              )
              return
            }
            void run(
              () => razorpayApi.webhook(mode, webhookSecret),
              `${label} webhook secret saved.`
            )
          }}
        >
          <h3 className="font-semibold text-slate-800">
            Automatic payment updates
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {connection.hasWebhookSecret ? 'Webhook secret configured. ' : ''}In
            Razorpay’s {label} webhook settings, use your public HTTPS API
            address followed by the path below. Enable payment_link.paid,
            payment_link.partially_paid, payment_link.cancelled,
            payment_link.expired, payment.captured, refund.created,
            refund.processed and refund.failed. Use the same secret here and in
            Razorpay.
          </p>
          <code className="mt-3 block break-all rounded-lg bg-slate-50 p-3 text-xs">
            {connection.webhookPath}
          </code>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            {label} webhook secret
            <input
              type="password"
              className={input}
              value={webhookSecret}
              minLength={16}
              maxLength={256}
              autoComplete="new-password"
              disabled={pending || !available}
              onChange={event => setWebhookSecret(event.target.value)}
            />
          </label>
          <p className="my-3 text-xs text-slate-500">
            Local development: use Refresh on Payment links. Automatic delivery
            requires a public HTTPS endpoint. When rotating secrets, previous
            secrets remain valid for the 24-hour delivery retry window.
          </p>
          <Button
            type="submit"
            variant="outline"
            size="small"
            disabled={pending || !available}
          >
            Save webhook secret
          </Button>
        </form>
      )}
    </section>
  )
}

export function PaymentSettingsPage() {
  const query = useRazorpaySetup()
  const client = useQueryClient()
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.razorpay }),
      client.invalidateQueries({ queryKey: queryKeys.gateway }),
      client.invalidateQueries({ queryKey: queryKeys.invoices }),
    ])
  return (
    <ResponsiveContainer maxWidth="xl" padding="md">
      <div className="py-6 sm:py-10">
        <Link to="/payments" className="text-sm text-primary-700 underline">
          Back to payments
        </Link>
        <Link
          to="/payments/links"
          className="ml-4 text-sm text-primary-700 underline"
        >
          Payment links
        </Link>
        <div className="mt-6 mb-6">
          <ShieldCheck
            className="mb-3 text-primary-600"
            size={28}
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Payment settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Connect your business’s Razorpay account. Test and Live credentials
            are stored separately. Secrets are encrypted on the server and are
            never returned.
          </p>
        </div>
        <p className="mb-6 rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm leading-relaxed text-primary-800">
          Connecting verifies API access. It does not create payment links,
          collect money or send messages.
        </p>
        {query.isPending && (
          <p role="status" className="py-8">
            Loading payment settings…
          </p>
        )}
        {query.error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
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
            {!query.data.setupAvailable && (
              <p
                role="status"
                className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
              >
                Payment account setup is not available yet. Contact the
                administrator to enable it.
              </p>
            )}
            <div className="grid min-w-0 gap-5 lg:grid-cols-2">
              {(['TEST', 'LIVE'] as const).map(mode => (
                <ConnectionForm
                  key={mode}
                  mode={mode}
                  connection={query.data.connections.find(
                    connection => connection.mode === mode
                  )}
                  available={query.data.setupAvailable}
                  refresh={refresh}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </ResponsiveContainer>
  )
}
