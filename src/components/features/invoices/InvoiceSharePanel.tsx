import { useEffect, useState } from 'react'
import type { Invoice } from '../../../types/entities'
import {
  invoiceSharingApi,
  type InvoiceShareStatus,
} from '../../../services/api/invoiceSharingApi'
import { Button } from '../../ui/Button'

export function InvoiceSharePanel({
  invoice,
  refreshing = false,
}: {
  invoice: Invoice
  refreshing?: boolean
}) {
  const [status, setStatus] = useState<InvoiceShareStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (invoice.status === 'draft') return
    const controller = new AbortController()
    setStatus(null)
    setError(null)
    invoiceSharingApi.status(invoice.id, controller.signal).then(
      value => {
        if (!controller.signal.aborted) setStatus(value)
      },
      failure => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Sharing could not be loaded.'
          )
      }
    )
    return () => controller.abort()
  }, [invoice.id, invoice.status, revision])
  if (invoice.status === 'draft') return null
  const copy = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await invoiceSharingApi.create(invoice.id, !status?.active)
      const link = `${window.location.origin}/shared/invoice#${result.token}`
      setUrl(link)
      setStatus(current =>
        current
          ? { ...current, active: true, createdAt: result.createdAt }
          : null
      )
      try {
        await navigator.clipboard.writeText(link)
        setMessage('Invoice link copied.')
      } catch {
        setMessage('Copy the invoice link from the field below.')
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'The invoice link could not be created.'
      )
    } finally {
      setBusy(false)
    }
  }
  const revoke = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await invoiceSharingApi.revoke(invoice.id)
      setUrl('')
      setConfirm(false)
      setStatus(current =>
        current ? { ...current, active: false, createdAt: null } : null
      )
      setMessage('Invoice link revoked.')
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'The invoice link could not be revoked.'
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section
      aria-label="Invoice sharing"
      className="no-print mb-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <h3 className="font-semibold text-slate-900">Share invoice</h3>
      <p className="mt-2 text-sm text-slate-600">
        Anyone with this link can view the current invoice and download its PDF
        without signing in. The link stays valid until you revoke it.
      </p>
      {!status && !error && (
        <p role="status" className="mt-3 text-sm">
          Loading sharing settings…
        </p>
      )}
      {status && (
        <>
          <p className="mt-3 text-sm text-slate-600">
            {status.active
              ? 'A public link is active.'
              : 'This invoice has no public link.'}
          </p>
          {!status.available && (
            <p className="mt-2 text-sm text-amber-800">
              Invoice sharing is not configured on this server. Contact the
              administrator.
            </p>
          )}
          {!status.active && !status.canCreate && (
            <p className="mt-2 text-sm text-slate-600">
              New links are available for Sent or Paid invoices.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {status.available && (status.active || status.canCreate) && (
              <Button
                type="button"
                size="small"
                disabled={busy || refreshing}
                onClick={() => void copy()}
              >
                {status.active
                  ? 'Copy invoice link'
                  : 'Create & copy invoice link'}
              </Button>
            )}
            {status.active && (
              <Button
                type="button"
                size="small"
                variant="outline"
                disabled={busy || refreshing}
                onClick={() => setConfirm(true)}
              >
                Revoke invoice link
              </Button>
            )}
          </div>
        </>
      )}
      {confirm && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm">
            Revoke this invoice link? Future access stops. Copies already
            downloaded or opened cannot be erased.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="small"
              variant="danger"
              disabled={busy || refreshing}
              onClick={() => void revoke()}
            >
              Confirm revocation
            </Button>
            <Button
              type="button"
              size="small"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Keep invoice link
            </Button>
          </div>
        </div>
      )}
      {busy && (
        <p role="status" className="mt-3 text-sm">
          Updating invoice link…
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {message}
        </p>
      )}
      {url && status?.active && (
        <label className="mt-3 block text-sm">
          Public invoice link
          <input
            className="mt-1 block w-full rounded-lg border border-slate-300 p-2"
            value={url}
            readOnly
            onFocus={event => event.target.select()}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}{' '}
          <button
            type="button"
            className="underline"
            disabled={busy}
            onClick={() => setRevision(value => value + 1)}
          >
            Retry sharing
          </button>
        </p>
      )}
    </section>
  )
}
