import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUpiPreferences } from '../../../hooks/useDirectUpi'
import { directUpiApi } from '../../../services/api/directUpiApi'
import { queryKeys } from '../../../lib/queryKeys'
import type { DirectUpiDetails } from '../../../types/directUpi'
import { validUpiDetails } from '../../../utils/directUpi'
import { Button } from '../../ui/Button'

export function DirectUpiSettings() {
  const query = useUpiPreferences()
  const [message, setMessage] = useState('')
  return (
    <section
      aria-label="Direct UPI settings"
      className="mb-6 min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-semibold text-slate-900">Direct UPI</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Save your business’s receiving UPI ID and payee name. Customers pay
        directly to this UPI ID. Confirm the receipt in your UPI or bank app,
        then record it against the invoice.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        No Razorpay connection is required. Saving checks the format only; it
        does not verify the account or receive a payment.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Updating or removing these defaults does not change receiving details
        already enabled on an invoice.
      </p>
      {query.isPending && (
        <p role="status" className="mt-4 text-sm">
          Loading UPI settings…
        </p>
      )}
      {query.error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {query.error.message}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void query.refetch()}
          >
            Retry UPI settings
          </button>
        </p>
      )}
      {query.data !== undefined && (
        <PreferencesForm
          key={JSON.stringify(query.data)}
          saved={query.data}
          stale={!!query.error || query.isFetching}
          onSaved={setMessage}
        />
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-emerald-700">
          {message}
        </p>
      )}
    </section>
  )
}

function PreferencesForm({
  saved,
  stale,
  onSaved,
}: {
  saved: DirectUpiDetails | null
  stale: boolean
  onSaved: (message: string) => void
}) {
  const client = useQueryClient()
  const [upiId, setUpiId] = useState(saved?.upiId ?? '')
  const [payeeName, setPayeeName] = useState(saved?.payeeName ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function run(action: () => Promise<unknown>, success: string) {
    if (pending || stale) return
    setPending(true)
    setError('')
    onSaved('')
    try {
      await action()
      onSaved(success)
      await client.invalidateQueries({ queryKey: queryKeys.payments })
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not save UPI settings. Try again.'
      )
    } finally {
      setPending(false)
    }
  }
  const input =
    'mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50'
  return (
    <form
      className="mt-5"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        if (pending || stale) return
        const details = { upiId: upiId.trim(), payeeName: payeeName.trim() }
        if (!validUpiDetails(details)) {
          onSaved('')
          setError(
            'Enter a UPI ID such as business@bank and a payee name of 1–80 characters.'
          )
          return
        }
        void run(
          () => directUpiApi.savePreferences(details),
          'UPI details saved.'
        )
      }}
    >
      <fieldset disabled={pending || stale} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block min-w-0 text-sm font-medium text-slate-700">
            Receiving UPI ID
            <input
              className={input}
              value={upiId}
              maxLength={255}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              placeholder="business@bank"
              onChange={event => setUpiId(event.target.value)}
            />
          </label>
          <label className="block min-w-0 text-sm font-medium text-slate-700">
            UPI payee name
            <input
              className={input}
              value={payeeName}
              maxLength={80}
              autoComplete="off"
              onChange={event => setPayeeName(event.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="small" loading={pending}>
            Save UPI details
          </Button>
          {saved && (
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={() =>
                void run(
                  () => directUpiApi.removePreferences(),
                  'Saved UPI details removed.'
                )
              }
            >
              Remove saved UPI details
            </Button>
          )}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  )
}
