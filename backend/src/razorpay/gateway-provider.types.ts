import { BadGatewayException } from '@nestjs/common';

export type LinkStatus = 'created' | 'partially_paid' | 'paid' | 'cancelled' | 'expired';
export interface ProviderLink {
  id: string;
  referenceId: string;
  amount: bigint;
  amountPaid: bigint;
  currency: string;
  status: LinkStatus;
  url: string;
  orderId: string | null;
  paymentIds: string[];
  sourceId: string | null;
}
export interface ProviderRefund {
  id: string;
  paymentId: string;
  amount: bigint;
  currency: string;
  status: 'pending' | 'processed' | 'failed';
  createdAt: Date;
}
export interface ProviderPayment {
  id: string;
  sourceId: string | null;
  amount: bigint;
  currency: string;
  method: string;
  orderId: string | null;
  captured: boolean;
  createdAt: Date;
  refunds: ProviderRefund[];
}
export const invalidProvider = () =>
  new BadGatewayException(
    'Razorpay returned inconsistent payment data. Refresh again or contact support.',
  );
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidProvider();
  return value as Record<string, unknown>;
}
export function text(value: unknown, max = 256): string {
  if (typeof value !== 'string' || !value.length || value.length > max) throw invalidProvider();
  return value;
}
export function providerId(value: unknown, prefix: string): string {
  const id = text(value, 100);
  if (!new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(id)) throw invalidProvider();
  return id;
}
export function minor(value: unknown): bigint {
  if (
    (typeof value !== 'string' || !/^\d+$/.test(value)) &&
    (typeof value !== 'number' || !Number.isSafeInteger(value))
  )
    throw invalidProvider();
  const amount = BigInt(value);
  if (amount < 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) throw invalidProvider();
  return amount;
}
export function providerDate(value: unknown): Date {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw invalidProvider();
  const date = new Date(value * 1000);
  if (!Number.isFinite(date.getTime())) throw invalidProvider();
  return date;
}
export function parseLink(value: unknown): ProviderLink {
  const row = object(value);
  const status = text(row.status);
  if (!['created', 'partially_paid', 'paid', 'cancelled', 'expired'].includes(status))
    throw invalidProvider();
  let url: URL;
  try {
    url = new URL(text(row.short_url));
  } catch {
    throw invalidProvider();
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'rzp.io' ||
    url.username ||
    url.password ||
    url.port
  )
    throw invalidProvider();
  const payments = row.payments ?? [];
  if (!Array.isArray(payments)) throw invalidProvider();
  const notes = row.notes && !Array.isArray(row.notes) ? object(row.notes) : {};
  return {
    id: providerId(row.id, 'plink'),
    referenceId: text(row.reference_id, 40),
    amount: minor(row.amount),
    amountPaid: minor(row.amount_paid),
    currency: text(row.currency, 3),
    status: status as LinkStatus,
    url: url.toString(),
    orderId: row.order_id ? providerId(row.order_id, 'order') : null,
    paymentIds: payments.map((item: unknown) => providerId(object(item).payment_id, 'pay')),
    sourceId: typeof notes.invoiceo_link === 'string' ? notes.invoiceo_link : null,
  };
}
