import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Counter locks precede existing invoice/catalog locks, including number edits. */
export async function lockDocumentCounter(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: 'INVOICE' | 'QUOTE',
) {
  return tx.documentCounter.upsert({
    where: { userId_kind: { userId, kind } },
    create: { userId, kind },
    update: { value: { increment: 0 } },
  });
}

/** Keep canonical custom numbers above the sequence from being reused after deletion/renaming. */
export async function advanceDocumentCounter(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: 'INVOICE' | 'QUOTE',
  number: string,
) {
  const prefix = kind === 'INVOICE' ? 'INV' : 'QT';
  const match = new RegExp(`^${prefix}-([0-9]{6,18})$`).exec(number);
  if (match) {
    const value = BigInt(match[1]);
    await tx.documentCounter.updateMany({
      where: { userId, kind, value: { lt: value } },
      data: { value },
    });
  }
}

/** A number remains attached to its original document even after deletion or renaming. */
export async function recordDocumentNumber(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: 'INVOICE' | 'QUOTE',
  number: string,
  documentId: string,
) {
  const where = { userId_kind_number: { userId, kind, number } };
  const prior = await tx.documentNumber.findUnique({ where });
  if (prior) {
    if (prior.documentId !== documentId)
      throw new ConflictException(
        'This document number was already used in your account. Choose a new number.',
      );
    return;
  }
  await tx.documentNumber.create({ data: { userId, kind, number, documentId } });
  await advanceDocumentCounter(tx, userId, kind, number);
}

/** Call before catalog locks; the account counter serializes all new numbers, including custom ones. */
export async function allocateDocumentNumber(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: 'INVOICE' | 'QUOTE',
  requested?: string,
) {
  const where = { userId_kind: { userId, kind } };
  await lockDocumentCounter(tx, userId, kind);
  const wasUsed = (number: string) =>
    tx.documentNumber.findUnique({
      where: { userId_kind_number: { userId, kind, number } },
      select: { documentId: true },
    });
  const exists = (number: string) =>
    kind === 'INVOICE'
      ? tx.invoice.findUnique({
          where: { userId_invoiceNumber: { userId, invoiceNumber: number } },
          select: { id: true },
        })
      : tx.quote.findUnique({
          where: { userId_quoteNumber: { userId, quoteNumber: number } },
          select: { id: true },
        });
  if (requested?.trim()) {
    const number = requested.trim();
    if (await wasUsed(number))
      throw new ConflictException(
        'This document number was already used in your account. Choose a new number.',
      );
    if (await exists(number))
      throw new ConflictException('An invoice with this number already exists in your account.');
    await advanceDocumentCounter(tx, userId, kind, number);
    return number;
  }
  for (;;) {
    const counter = await tx.documentCounter.update({ where, data: { value: { increment: 1 } } });
    const number = `${kind === 'INVOICE' ? 'INV' : 'QT'}-${counter.value.toString().padStart(6, '0')}`;
    if (!(await wasUsed(number)) && !(await exists(number))) return number;
  }
}
