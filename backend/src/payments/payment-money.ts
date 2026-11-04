import { BadRequestException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { currencyDigits, money } from '../invoice/invoice-calculation';

export const MAX_PAYMENT_MINOR = BigInt(Number.MAX_SAFE_INTEGER);

/** Convert an existing invoice amount using its established rounding contract. */
export function savedMinor(value: number, currency: string): bigint {
  if (!Number.isFinite(value) || value < 0)
    throw new BadRequestException('Payment amounts must be finite and non-negative.');
  try {
    const digits = currencyDigits(currency);
    return BigInt(money(value, currency).toFixed(digits).replace('.', ''));
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Invalid payment amount.',
    );
  }
}

/** New UPI inputs are exact INR decimals; never silently round a receipt. */
export function upiMinor(value: string): bigint {
  if (typeof value !== 'string' || !/^\d{1,14}(?:\.\d{1,2})?$/.test(value))
    throw new BadRequestException('Enter an INR amount with at most two decimal places.');
  const whole = value.split('.')[0];
  const fraction = value.includes('.') ? value.slice(value.indexOf('.') + 1) : '';
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (amount <= 0n || amount > MAX_PAYMENT_MINOR)
    throw new BadRequestException(
      'Payment must be positive and within the supported invoice amount.',
    );
  return amount;
}

export function paymentAmount(value: bigint, currency: string): string {
  const digits = currencyDigits(currency);
  const sign = value < 0n ? '-' : '';
  const absolute = (value < 0n ? -value : value).toString().padStart(digits + 1, '0');
  return digits
    ? `${sign}${absolute.slice(0, -digits)}.${absolute.slice(-digits)}`
    : `${sign}${absolute}`;
}

/** Keep the existing numeric invoice contract as a checked, ledger-derived cache. */
export function paidCache(value: bigint, currency: string): number {
  if (value < 0n || value > MAX_PAYMENT_MINOR)
    throw new BadRequestException('Paid balance is outside the supported invoice amount.');
  const amount = Number(paymentAmount(value, currency));
  if (savedMinor(amount, currency) !== value)
    throw new BadRequestException('Payment exceeds the precision supported by this invoice.');
  return amount;
}

export function paidStatus(status: InvoiceStatus, total: bigint, paid: bigint): InvoiceStatus {
  if (paid < 0n || paid > total)
    throw new BadRequestException(
      'Recorded payments cannot exceed the invoice total. Reverse a payment before reducing the total.',
    );
  if (status === 'DRAFT' || status === 'VOIDED') return status;
  if (total > 0n && paid === total) return InvoiceStatus.PAID;
  if (paid < total) return InvoiceStatus.SENT;
  return status; // Preserve existing zero-total issued invoice lifecycle.
}
