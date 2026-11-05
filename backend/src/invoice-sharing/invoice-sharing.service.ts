import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { lockInvoiceRow } from '../invoice/invoice-lock';
import { ShareToken } from './share-token';
import { publicDocument, publicInvoiceSelect } from './public-document';

@Injectable()
export class InvoiceSharingService {
  private readonly logger = new Logger(InvoiceSharingService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: ShareToken,
  ) {}

  async status(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { userId, id: invoiceId },
      select: {
        status: true,
        publicShare: { select: { createdAt: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found or access denied');
    return {
      available: this.tokens.available,
      active: !!invoice.publicShare,
      canCreate: ['SENT', 'PAID'].includes(invoice.status),
      createdAt: invoice.publicShare?.createdAt ?? null,
    };
  }

  async create(userId: string, invoiceId: string, createIfMissing: boolean) {
    return this.prisma.$transaction(async (tx) => {
      await lockInvoiceRow(tx, userId, invoiceId);
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        select: { status: true, publicShare: true },
      });
      if (!invoice.publicShare && !createIfMissing)
        throw new ConflictException(
          'This invoice link was revoked. Reload sharing settings before creating a new link.',
        );
      if (invoice.status === 'DRAFT' || (!invoice.publicShare && invoice.status === 'VOIDED'))
        throw new ConflictException('Share an issued Sent or Paid invoice. Drafts stay private.');
      // Sign before inserting so missing server configuration cannot leave a half-created share.
      const id = invoice.publicShare?.id ?? randomBytes(32).toString('base64url');
      const token = this.tokens.sign(id);
      const share =
        invoice.publicShare ?? (await tx.invoiceShare.create({ data: { id, userId, invoiceId } }));
      return { token, createdAt: share.createdAt };
    });
  }

  async revoke(userId: string, invoiceId: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockInvoiceRow(tx, userId, invoiceId);
      await tx.invoiceShare.deleteMany({ where: { userId, invoiceId } });
    });
  }

  async read(authorization: string | undefined) {
    const token = /^Bearer ([A-Za-z0-9._-]+)$/.exec(authorization ?? '')?.[1] ?? '';
    const id = this.tokens.read(token);
    if (!id)
      throw new NotFoundException(
        'This invoice link is unavailable. Ask the sender for a new link.',
      );
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const share = await tx.invoiceShare.findUnique({
            where: { id },
            select: { id: true, invoice: { select: publicInvoiceSelect } },
          });
          if (!share || share.invoice.status === 'DRAFT')
            throw new NotFoundException(
              'This invoice link is unavailable. Ask the sender for a new link.',
            );
          return publicDocument(share.id, share.invoice);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        'Public invoice read failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Invoice sharing is temporarily unavailable. Please try again.',
      );
    }
  }
}
