import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Invoice, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { lockInvoiceRow } from '../invoice/invoice-lock';
import { requireResolvedLiveLink } from '../razorpay/gateway-policy';
import { paymentBalance, syncPaidInvoice } from './payment-ledger';
import { paymentAmount, savedMinor, upiMinor } from './payment-money';
import {
  PaymentHistoryQueryDto,
  PaymentInvoiceQueryDto,
  RecordUpiPaymentDto,
  ReversePaymentDto,
} from './payment.dto';

const entryInclude = {
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      quickCustomerName: true,
      customer: { select: { name: true } },
    },
  },
  reversal: { select: { id: true } },
  reversalOf: { select: { sequence: true } },
} satisfies Prisma.PaymentEntryInclude;
type Entry = Prisma.PaymentEntryGetPayload<{ include: typeof entryInclude }>;
const hash = (payload: object) =>
  createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
function customerName(invoice: {
  quickCustomerName: string | null;
  customer: { name: string } | null;
}) {
  return invoice.quickCustomerName?.trim()
    ? invoice.quickCustomerName
    : (invoice.customer?.name ?? '');
}
const paginate = <T>(data: T[], total: number, page: number, limit: number) => ({
  data,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});
function serialize(entry: Entry) {
  return {
    id: entry.id,
    sequence: entry.sequence.toString(),
    requestId: entry.requestId,
    kind: entry.kind,
    amountMinor: entry.amountMinor.toString(),
    amount: paymentAmount(entry.amountMinor, entry.currency),
    currency: entry.currency,
    openingSource: entry.openingSource,
    paymentDate: entry.paymentDate?.toISOString().slice(0, 10) ?? null,
    reference: entry.reference,
    notes: entry.notes,
    createdAt: entry.createdAt,
    reversalOfId: entry.reversalOfId,
    reversalOfSequence: entry.reversalOf?.sequence.toString() ?? null,
    reversedById: entry.reversal?.id ?? null,
    invoice: {
      id: entry.invoice.id,
      invoiceNumber: entry.invoice.invoiceNumber,
      status: entry.invoice.status,
      customerName: customerName(entry.invoice),
    },
  };
}

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  record(userId: string, invoiceId: string, dto: RecordUpiPaymentDto) {
    const amountMinor = upiMinor(dto.amount);
    const trimmedReference = dto.reference?.trim() ?? '';
    const reference = trimmedReference.length ? trimmedReference : null;
    const notes = dto.notes?.trim() ?? '';
    const requestHash = hash({
      operation: 'upi',
      invoiceId,
      amountMinor: amountMinor.toString(),
      paymentDate: dto.paymentDate,
      reference,
      notes,
    });
    return this.post(userId, invoiceId, dto.requestId, requestHash, async (tx, invoice) => {
      if (invoice.currency !== 'INR')
        throw new ConflictException('New UPI receipts are available only for INR invoices.');
      if (invoice.status !== 'SENT')
        throw new ConflictException('Issue an unpaid invoice before recording a UPI payment.');
      const paid = await paymentBalance(tx, invoiceId, userId);
      const available = savedMinor(invoice.total, invoice.currency) - paid;
      if (amountMinor > available)
        throw new ConflictException({
          message: 'Payment exceeds the invoice balance.',
          details: {
            balance: paymentAmount(available, invoice.currency),
            currency: invoice.currency,
          },
        });
      return tx.paymentEntry.create({
        data: {
          userId,
          invoiceId,
          requestId: dto.requestId,
          requestHash,
          kind: 'UPI',
          amountMinor,
          currency: invoice.currency,
          paymentDate: date(dto.paymentDate),
          reference,
          notes,
        },
        include: entryInclude,
      });
    });
  }

  async reverse(userId: string, entryId: string, dto: ReversePaymentDto) {
    const source = await this.prisma.paymentEntry.findFirst({
      where: { id: entryId, userId },
      select: { invoiceId: true },
    });
    if (!source) throw new NotFoundException('Payment entry not found or access denied.');
    const requestHash = hash({
      operation: 'reversal',
      entryId,
      paymentDate: dto.paymentDate,
      reason: dto.reason.trim(),
    });
    return this.post(userId, source.invoiceId, dto.requestId, requestHash, async (tx, invoice) => {
      if (invoice.status === 'VOIDED')
        throw new ConflictException('Payments on a voided invoice cannot be changed.');
      const original = await tx.paymentEntry.findFirstOrThrow({
        where: { id: entryId, userId, invoiceId: invoice.id },
        include: { reversal: { select: { id: true } } },
      });
      if (original.kind !== 'OPENING' && original.kind !== 'UPI')
        throw new BadRequestException(
          'Only an original UPI receipt or opening balance can be reversed.',
        );
      if (original.reversal)
        throw new ConflictException('This payment entry has already been reversed.');
      return tx.paymentEntry.create({
        data: {
          userId,
          invoiceId: invoice.id,
          requestId: dto.requestId,
          requestHash,
          kind: 'REVERSAL',
          amountMinor: -original.amountMinor,
          currency: original.currency,
          reversalOfId: original.id,
          paymentDate: date(dto.paymentDate),
          notes: dto.reason.trim(),
        },
        include: entryInclude,
      });
    });
  }

  private replay(entry: Entry, requestHash: string) {
    if (entry.requestHash !== requestHash)
      throw new ConflictException(
        'This request ID was already used with different payment details. Review the timeline before recording another payment.',
      );
    return { replayed: true, entry: serialize(entry) };
  }

  private async post(
    userId: string,
    invoiceId: string,
    requestId: string,
    requestHash: string,
    write: (tx: Prisma.TransactionClient, invoice: Invoice) => Promise<Entry>,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await lockInvoiceRow(tx, userId, invoiceId);
          const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
          const existing = await tx.paymentEntry.findUnique({
            where: { userId_requestId: { userId, requestId } },
            include: entryInclude,
          });
          if (existing) return this.replay(existing, requestHash);
          await requireResolvedLiveLink(tx, userId, invoiceId);
          const entry = await write(tx, invoice);
          const updated = await syncPaidInvoice(tx, invoice);
          return {
            replayed: false,
            entry: serialize({ ...entry, invoice: { ...entry.invoice, status: updated.status } }),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.paymentEntry.findUnique({
          where: { userId_requestId: { userId, requestId } },
          include: entryInclude,
        });
        if (existing) return this.replay(existing, requestHash);
        throw new ConflictException(
          'This payment conflicts with existing history. Refresh the timeline.',
        );
      }
      throw error;
    }
  }

  async summary(userId: string, invoiceId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, userId } });
        if (!invoice) throw new NotFoundException('Invoice not found or access denied.');
        const paid = await paymentBalance(tx, invoiceId, userId);
        const total = savedMinor(invoice.total, invoice.currency);
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          currency: invoice.currency,
          total: paymentAmount(total, invoice.currency),
          amountPaid: paymentAmount(paid, invoice.currency),
          balance: paymentAmount(invoice.status === 'VOIDED' ? 0n : total - paid, invoice.currency),
          hasPaymentHistory:
            (await tx.paymentEntry.count({ where: { userId, invoiceId } })) > 0 ||
            (await tx.gatewayPayment.count({
              where: { userId, invoiceId, link: { mode: 'LIVE' } },
            })) > 0,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async payableInvoices(userId: string, query: PaymentInvoiceQueryDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const where: Prisma.InvoiceWhereInput = {
          userId,
          status: 'SENT',
          currency: 'INR',
          total: { gt: tx.invoice.fields.amountPaid },
          ...(query.search?.trim() && {
            OR: [
              { invoiceNumber: { contains: query.search.trim(), mode: 'insensitive' } },
              { quickCustomerName: { contains: query.search.trim(), mode: 'insensitive' } },
              { customer: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
            ],
          }),
        };
        const total = await tx.invoice.count({ where });
        const rows = await tx.invoice.findMany({
          where,
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            amountPaid: true,
            currency: true,
            quickCustomerName: true,
            customer: { select: { name: true } },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        });
        return paginate(
          rows.map((row) => ({
            id: row.id,
            invoiceNumber: row.invoiceNumber,
            customerName: customerName(row),
            currency: row.currency,
            balance: paymentAmount(
              savedMinor(row.total, row.currency) - savedMinor(row.amountPaid, row.currency),
              row.currency,
            ),
          })),
          total,
          query.page,
          query.limit,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async history(userId: string, query: PaymentHistoryQueryDto) {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo)
      throw new BadRequestException('Start date cannot be after end date.');
    return this.prisma.$transaction(
      async (tx) => {
        if (
          query.invoiceId &&
          !(await tx.invoice.findFirst({
            where: { id: query.invoiceId, userId },
            select: { id: true },
          }))
        )
          throw new NotFoundException('Invoice not found or access denied.');
        const where: Prisma.PaymentEntryWhereInput = {
          userId,
          ...(query.invoiceId && { invoiceId: query.invoiceId }),
          ...(query.kind && { kind: query.kind }),
          ...(query.status !== 'all' && {
            AND: [
              { kind: { not: 'REVERSAL' } },
              { reversal: { is: query.status === 'active' ? null : {} } },
            ],
          }),
          ...((query.dateFrom !== undefined || query.dateTo !== undefined) && {
            paymentDate: {
              ...(query.dateFrom && { gte: date(query.dateFrom) }),
              ...(query.dateTo && { lte: date(query.dateTo) }),
            },
          }),
          ...(query.search?.trim() && {
            OR: [
              { reference: { contains: query.search.trim(), mode: 'insensitive' } },
              {
                invoice: { invoiceNumber: { contains: query.search.trim(), mode: 'insensitive' } },
              },
            ],
          }),
        };
        const total = await tx.paymentEntry.count({ where });
        const entries = await tx.paymentEntry.findMany({
          where,
          include: entryInclude,
          orderBy: { sequence: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        });
        return paginate(entries.map(serialize), total, query.page, query.limit);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
