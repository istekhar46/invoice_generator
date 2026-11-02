const MAX_INVOICE_LOGO_BYTES = 256 * 1024

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Company logo could not be read.'))
    reader.readAsDataURL(blob)
  })
}

/** Embed a copy: replacing/deleting a profile logo must not change a quick invoice. */
export async function companyLogoSnapshot(url: string): Promise<string> {
  const response = await fetch(url, {
    credentials: 'omit',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Company logo could not be downloaded.')
  const source = await response.blob()
  if (
    ['image/png', 'image/jpeg'].includes(source.type) &&
    source.size <= MAX_INVOICE_LOGO_BYTES
  ) {
    return dataUrl(source)
  }
  if (
    !['image/png', 'image/jpeg', 'image/gif'].includes(source.type) ||
    source.size > 5 * 1024 * 1024
  ) {
    throw new Error('Use a PNG, JPEG or GIF company logo up to 5 MB.')
  }
  const objectUrl = URL.createObjectURL(source)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () =>
        reject(new Error('Company logo could not be opened.'))
      image.src = objectUrl
    })
    const scale = Math.min(
      1,
      512 / Math.max(image.naturalWidth, image.naturalHeight)
    )
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context)
      throw new Error('This browser could not prepare the company logo.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const snapshot = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        blob =>
          blob
            ? resolve(blob)
            : reject(new Error('Company logo could not be prepared.')),
        'image/png'
      )
    )
    if (snapshot.size > MAX_INVOICE_LOGO_BYTES)
      throw new Error(
        'Use a smaller company logo to reuse it in quick invoices.'
      )
    return dataUrl(snapshot)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
