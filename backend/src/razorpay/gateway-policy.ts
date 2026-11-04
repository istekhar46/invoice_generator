import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { savedMinor } from '../payments/payment-money';

/** Caller holds the invoice lock. A remote Live link must be resolved first. */
export async function requireResolvedLiveLink(
  tx: Prisma.TransactionClient,
  userId: string,
  invoiceId: string,
) {
  if (
    await tx.gatewayLink.findFirst({
      where: { userId, invoiceId, mode: 'LIVE', activeKey: { not: null } },
      select: { id: true },
    })
  )
    throw new ConflictException(
      'Refresh and cancel the active Live payment link before changing invoice charges or payment records. Open Payment links for this invoice.',
    );
}

export function invoicePaymentUrl(invoice: {
  status: string;
  currency: string;
  total: number;
  amountPaid: number;
  gatewayLinks: { url: string | null; amountMinor: bigint }[];
}) {
  if (invoice.status !== 'SENT' || invoice.currency !== 'INR') return null;
  const balance =
    savedMinor(invoice.total, invoice.currency) - savedMinor(invoice.amountPaid, invoice.currency);
  if (balance <= 0n) return null;
  return invoice.gatewayLinks.find((link) => link.amountMinor === balance)?.url ?? null;
}

export function refundApplied(
  received: bigint,
  applied: bigint,
  alreadyProcessed: bigint,
  nextRefund: bigint,
) {
  if (
    received <= 0n ||
    applied < 0n ||
    applied > received ||
    alreadyProcessed < 0n ||
    nextRefund <= 0n ||
    alreadyProcessed + nextRefund > received
  )
    throw new ConflictException(
      'Razorpay refund totals are inconsistent. Refresh again or contact support.',
    );
  const excess = received - applied;
  const before = alreadyProcessed > excess ? alreadyProcessed - excess : 0n;
  const after =
    alreadyProcessed + nextRefund > excess ? alreadyProcessed + nextRefund - excess : 0n;
  return after - before;
}
