/** Encode locally; payment URLs are never sent to an external QR-image service. */
export async function paymentQrDataUrl(url: string): Promise<string> {
  const { toDataURL } = await import('qrcode')
  return toDataURL(url, {
    type: 'image/png',
    errorCorrectionLevel: 'M',
    margin: 4,
    width: 384,
    color: { dark: '#000000ff', light: '#ffffffff' },
  })
}
