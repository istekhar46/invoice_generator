import { useEffect, useState } from 'react'
import { paymentQrDataUrl } from '../../../utils/paymentQr'

export function PaymentQr({ url }: { url: string }) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    url: string
    attempt: number
    image?: string
    error?: string
  } | null>(null)
  useEffect(() => {
    let active = true
    paymentQrDataUrl(url).then(
      image => {
        if (active) setResult({ url, attempt, image })
      },
      () => {
        if (active)
          setResult({
            url,
            attempt,
            error:
              'QR could not be generated. Use the payment link or try again.',
          })
      }
    )
    return () => {
      active = false
    }
  }, [url, attempt])
  const current =
    result?.url === url && result.attempt === attempt ? result : null
  return (
    <figure className="mb-3">
      {!current && (
        <p role="status" className="text-xs text-slate-500">
          Preparing payment QR…
        </p>
      )}
      {current?.error && (
        <p role="alert" className="text-xs text-red-700">
          {current.error}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => setAttempt(value => value + 1)}
          >
            Retry QR
          </button>
        </p>
      )}
      {current?.image && (
        <>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open secure payment page"
          >
            <img
              src={current.image}
              alt="QR code to open the secure Razorpay payment page"
              width={160}
              height={160}
              className="h-40 w-40 bg-white"
            />
          </a>
          <figcaption className="mt-1 text-xs text-slate-500">
            Scan to open secure payment page
          </figcaption>
        </>
      )}
    </figure>
  )
}
