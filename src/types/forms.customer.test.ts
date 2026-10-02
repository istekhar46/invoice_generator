import { describe, expect, it } from 'vitest'
import { customerSchema } from './forms'

const validCustomer = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+44 20 7946 0958',
  address: '1 Computing Lane',
  city: 'London',
  state: 'England',
  zipCode: 'SW1A 1AA',
}

describe('customerSchema', () => {
  it('accepts the international customer formats supported by the API', () => {
    expect(customerSchema.safeParse(validCustomer).success).toBe(true)
  })

  it('rejects phone numbers outside the API digit limit', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      phone: '+1234567890123456',
    })

    expect(result.success).toBe(false)
  })
})
