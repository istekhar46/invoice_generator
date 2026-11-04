import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Invoice edits, stock issue/void and payments share this serialization boundary. */
export async function lockInvoiceRow(tx: Prisma.TransactionClient, userId: string, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "invoices" WHERE "id" = ${id} AND "userId" = ${userId} FOR UPDATE`;
  if (!rows[0]) throw new NotFoundException('Invoice not found or access denied');
}
