import { useState, type ReactNode } from 'react'
import { useNewInvoiceDefaults } from '../../../hooks/useInvoiceDefaults'
import type { NewInvoiceDefaults } from '../../../types/invoiceDefaults'

interface Props {
  enabled: boolean
  includeLogo?: boolean
  children: (defaults?: NewInvoiceDefaults) => ReactNode
}

/** Resolve initialization once before opening a fresh form; never reset an active form. */
export function InvoiceDefaultsGate({
  enabled,
  includeLogo = false,
  children,
}: Props) {
  const query = useNewInvoiceDefaults(enabled, includeLogo)
  const [initial, setInitial] = useState<NewInvoiceDefaults>()
  const [withoutDefaults, setWithoutDefaults] = useState(false)
  const [withoutLogo, setWithoutLogo] = useState(false)
  if (!enabled || withoutDefaults) return children()
  if (initial) return children(initial)
  if (query.isPending || query.isFetching)
    return (
      <p role="status" className="p-6 text-sm text-slate-500">
        Loading your invoice defaults…
      </p>
    )
  if (!query.data || query.error)
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-white p-6 text-sm"
      >
        <p>Your invoice defaults could not be loaded. {query.error?.message}</p>
        <button
          type="button"
          className="qi-secondary mt-4"
          onClick={() => void query.refetch()}
        >
          Retry loading defaults
        </button>
        <button
          type="button"
          className="qi-secondary mt-3"
          onClick={() => setWithoutDefaults(true)}
        >
          Start without saved defaults
        </button>
      </div>
    )
  if (query.data.logoError && !withoutLogo)
    return (
      <div
        role="alert"
        className="rounded-xl border border-amber-200 bg-white p-6 text-sm"
      >
        <p>{query.data.logoError} Your other saved settings are available.</p>
        <button
          type="button"
          className="qi-secondary mt-4"
          onClick={() => void query.refetch()}
        >
          Retry company logo
        </button>
        <button
          type="button"
          className="qi-secondary mt-3"
          onClick={() => setWithoutLogo(true)}
        >
          Continue without company logo
        </button>
      </div>
    )
  // Capture initialization once; later query refreshes must not unmount an edited form.
  if (!initial) setInitial(query.data)
  return null
}
