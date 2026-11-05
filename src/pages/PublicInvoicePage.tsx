import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { InvoicePreview } from '../components/features/invoices/InvoicePreview'
import { Button } from '../components/ui/Button'
import {
  publicInvoiceModel,
  readPublicInvoice,
  type PublicInvoiceDocument,
} from '../services/api/invoiceSharingApi'
import { pdfGeneratorService } from '../services/pdf/pdfGenerator.service'

export function PublicInvoicePage() {
  const { hash } = useLocation()
  const token = hash.slice(1)
  return (
    <>
      <title>Shared invoice | Invoiceo</title>
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <meta name="referrer" content="no-referrer" />
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-semibold text-slate-500">
            Invoiceo · Shared invoice
          </p>
          <SharedDocument key={token} token={token} />
        </div>
      </main>
    </>
  )
}

function SharedDocument({ token }: { token: string }) {
  const [document, setDocument] = useState<PublicInvoiceDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [revision, setRevision] = useState(0)
  const alive = useRef(true)
  const exportController = useRef<AbortController | null>(null)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      exportController.current?.abort()
    }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setDocument(null)
    setError(null)
    if (
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) ||
      token.length > 512
    ) {
      setError(
        'This invoice link is unavailable. Ask the sender for a new link.'
      )
      setLoading(false)
      return () => controller.abort()
    }
    readPublicInvoice(token, controller.signal).then(
      value => {
        if (!controller.signal.aborted) {
          setDocument(value)
          setLoading(false)
        }
      },
      failure => {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : 'The invoice could not be loaded. Please try again.'
          )
          setLoading(false)
        }
      }
    )
    return () => controller.abort()
  }, [token, revision])
  const download = async () => {
    const controller = new AbortController()
    exportController.current = controller
    setDownloading(true)
    setError(null)
    try {
      const current = await readPublicInvoice(token, controller.signal)
      if (!alive.current) return
      setDocument(current)
      const invoice = publicInvoiceModel(current)
      const blob = await pdfGeneratorService.generateInvoicePDF(
        invoice,
        current.company,
        current.customer
      )
      if (alive.current && !controller.signal.aborted)
        pdfGeneratorService.downloadPDF(
          blob,
          `Invoice_${invoice.invoiceNumber}.pdf`
        )
    } catch (failure) {
      if (alive.current && !controller.signal.aborted) {
        setDocument(null)
        setError(
          failure instanceof Error
            ? failure.message
            : 'PDF download failed. Please try again.'
        )
      }
    } finally {
      if (alive.current) setDownloading(false)
    }
  }
  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={loading || downloading}
          onClick={() => setRevision(value => value + 1)}
        >
          Refresh invoice
        </Button>
        {document && (
          <Button
            type="button"
            disabled={loading || downloading}
            onClick={() => void download()}
          >
            {downloading ? 'Preparing PDF…' : 'Download PDF'}
          </Button>
        )}
      </div>
      {loading && (
        <p role="status" className="rounded-xl bg-white p-6">
          Loading invoice…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {document && !loading && (
        <>
          <p className="mb-4 text-sm text-slate-600">
            {document.status === 'VOIDED'
              ? 'This invoice is cancelled. No payment is due.'
              : document.status === 'PAID'
                ? 'This invoice is paid.'
                : 'This page shows the current invoice balance. Refresh after payment to check for updates.'}
          </p>
          <InvoicePreview
            invoice={{
              ...publicInvoiceModel(document),
              ...(downloading ? { paymentUrl: null, directUpi: null } : {}),
            }}
            company={document.company}
            customer={document.customer}
          />
        </>
      )}
    </>
  )
}
