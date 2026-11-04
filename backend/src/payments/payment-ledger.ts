import { Prisma, InvoiceStatus } from '@prisma/client';
import { paidCache, paidStatus, savedMinor } from './payment-money';

export async function paymentBalance(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  userId: string,
) {
  const sum = await tx.paymentEntry.aggregate({
    where: { userId, invoiceId },
    _sum: { amountMinor: true },
  });
  return sum._sum.amountMinor ?? 0n;
}

/** Only guest-import creation can introduce a new owner-provided opening balance. */
export async function createOpeningPayment(
  tx: Prisma.TransactionClient,
  invoice: { id: string; userId: string; currency: string; amountPaid: number },
) {
  const amountMinor = savedMinor(invoice.amountPaid, invoice.currency);
  if (amountMinor === 0n) return;
  await tx.paymentEntry.create({
    data: {
      userId: invoice.userId,
      invoiceId: invoice.id,
      kind: 'OPENING',
      amountMinor,
      currency: invoice.currency,
      openingSource: 'GUEST_IMPORT',
      openingKey: invoice.id,
      requestId: `opening_${invoice.id}`,
      notes:
        'Owner-provided opening balance from an imported guest draft. Payment method and date are unknown.',
    },
  });
}

/** Caller must hold the invoice row lock; payment changes never touch stock. */
export async function syncPaidInvoice(
  tx: Prisma.TransactionClient,
  invoice: { id: string; userId: string; currency: string; total: number; status: InvoiceStatus },
) {
  const paid = await paymentBalance(tx, invoice.id, invoice.userId);
  const amountPaid = paidCache(paid, invoice.currency);
  const status = paidStatus(invoice.status, savedMinor(invoice.total, invoice.currency), paid);
  return tx.invoice.update({ where: { id: invoice.id }, data: { amountPaid, status } });
}
