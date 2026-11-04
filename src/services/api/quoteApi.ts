import { apiClient } from './apiClient'
import {
  transformLineItemToDto,
  transformLineItemResponse,
} from '../../utils/apiTransformers'
import type { LineItemResponseDto } from './invoiceApi'
import type {
  Quote,
  QuoteConversion,
  QuoteInput,
  QuotePage,
  QuoteQuery,
  QuoteStatus,
} from '../../types/quotes'

type QuoteDto = Omit<Quote, 'lineItems'> & { lineItems: LineItemResponseDto[] }
const fromDto = (quote: QuoteDto): Quote => ({
  ...quote,
  lineItems: quote.lineItems.map(row =>
    transformLineItemResponse(row, quote.id)
  ),
})
const body = (input: QuoteInput) => ({
  ...input,
  lineItems: input.lineItems.map(transformLineItemToDto),
})
export const quoteApi = {
  async list(query: QuoteQuery, signal?: AbortSignal): Promise<QuotePage> {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== '') params.set(key, String(value))
    const page = await apiClient.get<
      Omit<QuotePage, 'data'> & { data: QuoteDto[] }
    >(`/quotes?${params}`, { signal })
    return { ...page, data: page.data.map(fromDto) }
  },
  async detail(id: string, signal?: AbortSignal) {
    return fromDto(
      await apiClient.get<QuoteDto>(`/quotes/${encodeURIComponent(id)}`, {
        signal,
      })
    )
  },
  async save({
    id,
    input,
    version,
    clientRequestId,
  }: {
    id?: string
    input: QuoteInput
    version?: number
    clientRequestId: string
  }) {
    return fromDto(
      id
        ? await apiClient.put<QuoteDto>(`/quotes/${encodeURIComponent(id)}`, {
            ...body(input),
            version,
          })
        : await apiClient.post<QuoteDto>('/quotes', {
            ...body(input),
            clientRequestId,
          })
    )
  },
  async status({
    id,
    version,
    status,
  }: {
    id: string
    version: number
    status: QuoteStatus
  }) {
    return fromDto(
      await apiClient.patch<QuoteDto>(
        `/quotes/${encodeURIComponent(id)}/status`,
        { version, status }
      )
    )
  },
  convert: ({ id, ...input }: QuoteConversion & { id: string }) =>
    apiClient.post<{
      invoice: { id: string; invoiceNumber: string; status: string }
      replayed: boolean
    }>(`/quotes/${encodeURIComponent(id)}/convert`, input),
}
