import { describe, expect, it } from 'vitest'
import {
  transformLineItemResponse,
  transformLineItemToDto,
} from './apiTransformers'

describe('Product/service invoice API round-trip', () => {
  it.each(['PRODUCT', 'SERVICE'] as const)(
    'preserves %s and its catalog reference',
    type => {
      const dto = {
        id: 'line-1',
        type,
        catalogItemId: 'item-1',
        description: 'Original snapshot',
        unit: 'hour',
        quantity: 2,
        rate: 0.335,
        amount: 0.67,
      }
      const row = transformLineItemResponse(dto, 'invoice-1')
      expect(row.type).toBe(type.toLowerCase())
      expect(row.amount).toBe(0.67)
      expect(transformLineItemToDto(row)).toEqual({
        type,
        catalogItemId: 'item-1',
        description: 'Original snapshot',
        unit: 'hour',
        quantity: 2,
        rate: 0.335,
      })
      expect(
        transformLineItemToDto({ ...row, catalogItemId: null }).catalogItemId
      ).toBeNull()
    }
  )
})
