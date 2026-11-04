import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GatewayLink, GatewayLinkState, Prisma, RazorpayConnection } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { lockInvoiceRow } from '../invoice/invoice-lock';
import { SUPPORTED_CURRENCIES } from '../invoice/invoice-calculation';
import { paymentBalance, syncPaidInvoice } from '../payments/payment-ledger';
import { paidCache, paymentAmount, savedMinor } from '../payments/payment-money';
import { GatewayProviderError, RazorpayProvider } from './razorpay-provider';
import { RazorpaySecrets } from './razorpay-secrets';
import { ProviderLink, ProviderPayment, invalidProvider } from './gateway-provider.types';
import { CreateGatewayLinkDto, GatewayLinkQueryDto } from './gateway.dto';
import { refundApplied } from './gateway-policy';

const include = {
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      currency: true,
      total: true,
      amountPaid: true,
    },
  },
  connection: { select: { enabled: true } },
  payments: {
    include: { refunds: { orderBy: { createdAt: 'asc' as const } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.GatewayLinkInclude;
type FullLink = Prisma.GatewayLinkGetPayload<{ include: typeof include }>;
export interface GatewayEvent {
  connectionId: string;
  providerEventId: string;
  digest: string;
  event: string;
}
const terminal = (state: GatewayLinkState) =>
  ['PAID', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(state);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const moneyText = (value: bigint, currency: string) =>
  SUPPORTED_CURRENCIES.includes(currency)
    ? paymentAmount(value, currency)
    : `${value.toString()} minor units`;

function serialize(link: FullLink) {
  return {
    id: link.id,
    invoiceId: link.invoiceId,
    mode: link.mode,
    state: link.state,
    referenceId: link.referenceId,
    amount: paymentAmount(link.amountMinor, 'INR'),
    currency: 'INR',
    providerId: link.providerId,
    url:
      link.state === 'ACTIVE' &&
      link.connection.enabled &&
      link.invoice.status === 'SENT' &&
      link.invoice.currency === 'INR' &&
      savedMinor(link.invoice.total, 'INR') - savedMinor(link.invoice.amountPaid, 'INR') ===
        link.amountMinor
        ? link.url
        : null,
    lastError: link.lastError,
    synchronizedAt: link.synchronizedAt,
    createdAt: link.createdAt,
    invoice: {
      id: link.invoice.id,
      invoiceNumber: link.invoice.invoiceNumber,
      status: link.invoice.status,
    },
    payments: link.payments.map((payment) => {
      const refunded = payment.refunds
        .filter((refund) => refund.status === 'processed')
        .reduce((sum, refund) => sum + refund.amountMinor, 0n);
      const deducted = payment.refunds.reduce((sum, refund) => sum + refund.appliedMinor, 0n);
      return {
        id: payment.id,
        providerId: payment.providerId,
        currency: payment.currency,
        method: payment.method,
        received: moneyText(payment.receivedMinor, payment.currency),
        applied: moneyText(payment.appliedMinor - deducted, payment.currency),
        refunded: moneyText(refunded, payment.currency),
        unapplied: moneyText(
          payment.receivedMinor - refunded - payment.appliedMinor + deducted,
          payment.currency,
        ),
        exception: payment.exception,
        providerCreatedAt: payment.providerCreatedAt,
        recordedAt: payment.createdAt,
        refunds: payment.refunds.map((refund) => ({
          id: refund.id,
          providerId: refund.providerId,
          status: refund.status,
          amount: moneyText(refund.amountMinor, payment.currency),
          invoiceReduction: moneyText(refund.appliedMinor, payment.currency),
          recordedAt: refund.createdAt,
        })),
      };
    }),
  };
}

@Injectable()
export class GatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: RazorpaySecrets,
    private readonly provider: RazorpayProvider,
  ) {}

  async list(userId: string, query: GatewayLinkQueryDto) {
    if (
      query.invoiceId &&
      !(await this.prisma.invoice.findFirst({
        where: { id: query.invoiceId, userId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Invoice not found or access denied.');
    return this.prisma.$transaction(
      async (tx) => {
        const where: Prisma.GatewayLinkWhereInput = {
          userId,
          mode: query.mode,
          ...(query.invoiceId && { invoiceId: query.invoiceId }),
          ...(query.state && { state: query.state }),
          ...(query.search?.trim() && {
            OR: [
              { referenceId: { contains: query.search.trim(), mode: 'insensitive' } },
              { providerId: { contains: query.search.trim(), mode: 'insensitive' } },
              {
                invoice: { invoiceNumber: { contains: query.search.trim(), mode: 'insensitive' } },
              },
            ],
          }),
        };
        const total = await tx.gatewayLink.count({ where });
        const rows = await tx.gatewayLink.findMany({
          where,
          include,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        });
        return {
          data: rows.map(serialize),
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
          hasNext: query.page * query.limit < total,
          hasPrev: query.page > 1,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async detail(userId: string, id: string) {
    const link = await this.prisma.gatewayLink.findFirst({ where: { id, userId }, include });
    if (!link) throw new NotFoundException('Payment link not found or access denied.');
    return serialize(link);
  }

  private async owned(userId: string, id: string) {
    const link = await this.prisma.gatewayLink.findFirst({
      where: { id, userId },
      include: { connection: true, payments: { select: { providerId: true } } },
    });
    if (!link) throw new NotFoundException('Payment link not found or access denied.');
    return link;
  }

  async create(userId: string, dto: CreateGatewayLinkDto) {
    const connection = await this.prisma.razorpayConnection.findUnique({
      where: { userId_mode: { userId, mode: dto.mode } },
    });
    if (!connection)
      throw new ConflictException('Connect this Razorpay mode in Payment settings first.');
    const intent = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM razorpay_connections WHERE id=${connection.id} AND "userId"=${userId} FOR UPDATE`;
      const current = await tx.razorpayConnection.findUniqueOrThrow({
        where: { id: connection.id },
      });
      const previousRequest = await tx.gatewayLinkRequest.findUnique({
        where: { userId_requestId: { userId, requestId: dto.requestId } },
        include: { link: true },
      });
      const previous = previousRequest?.link;
      if (previous) {
        if (previous.invoiceId !== dto.invoiceId || previous.mode !== dto.mode)
          throw new ConflictException(
            'This request was already used for another payment link. Review the list before creating another.',
          );
        return { link: previous, created: false, connection: current };
      }
      if (!current.enabled)
        throw new ConflictException('Enable this Razorpay connection in Payment settings first.');
      await lockInvoiceRow(tx, userId, dto.invoiceId);
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: dto.invoiceId } });
      const active = await tx.gatewayLink.findFirst({
        where: { userId, invoiceId: dto.invoiceId, mode: dto.mode, activeKey: { not: null } },
      });
      if (active) {
        await tx.gatewayLinkRequest.create({
          data: { userId, requestId: dto.requestId, linkId: active.id },
        });
        return { link: active, created: false, connection: current };
      }
      const amount =
        savedMinor(invoice.total, invoice.currency) -
        (await paymentBalance(tx, invoice.id, userId));
      if (invoice.status !== 'SENT' || invoice.currency !== 'INR' || amount <= 0n)
        throw new ConflictException(
          'Issue an INR invoice with an outstanding balance before creating a payment link.',
        );
      const link = await tx.gatewayLink.create({
        data: {
          userId,
          invoiceId: invoice.id,
          connectionId: current.id,
          mode: dto.mode,
          referenceId: `iv_${randomUUID().replaceAll('-', '')}`,
          amountMinor: amount,
          activeKey: `${dto.mode}:${invoice.id}`,
          createAttemptedAt: new Date(),
        },
      });
      await tx.gatewayLinkRequest.create({
        data: { userId, requestId: dto.requestId, linkId: link.id },
      });
      return { link, created: true, connection: current };
    });
    if (intent.created) await this.sendCreate(intent.link, intent.connection);
    return this.detail(userId, intent.link.id);
  }

  private validateLink(link: GatewayLink, remote: ProviderLink) {
    if (
      remote.amount !== link.amountMinor ||
      remote.currency !== 'INR' ||
      (link.providerId && remote.id !== link.providerId) ||
      (!link.providerId && (remote.referenceId !== link.referenceId || remote.sourceId !== link.id))
    )
      throw invalidProvider();
  }

  private async sendCreate(link: GatewayLink, connection: RazorpayConnection, recovering = false) {
    try {
      const credentials = this.secrets.credentials(connection);
      const existing = await this.provider.findLink(credentials, {
        reference_id: link.referenceId,
      });
      const remote =
        existing ??
        (await this.provider.createLink(credentials, link.referenceId, link.id, link.amountMinor));
      this.validateLink(link, remote);
      await this.apply(link, remote, await this.payments(connection, remote, []));
    } catch (error) {
      let failure: unknown = error;
      // A response may have been lost after creation. Recover this same reference.
      let definitive = error instanceof GatewayProviderError && error.definitive && !recovering;
      if (error instanceof GatewayProviderError && error.definitive) {
        try {
          const recovered = await this.provider.findLink(this.secrets.credentials(connection), {
            reference_id: link.referenceId,
          });
          if (recovered) {
            this.validateLink(link, recovered);
            await this.apply(link, recovered, await this.payments(connection, recovered, []));
            return;
          }
        } catch (recoveryError) {
          definitive = false;
          failure = recoveryError;
        }
      }
      await this.prisma.gatewayLink.updateMany({
        where: { id: link.id, state: 'PENDING' },
        data: {
          state: definitive ? 'FAILED' : 'UNKNOWN',
          ...(definitive ? { activeKey: null } : {}),
          lastError: definitive
            ? 'Razorpay rejected link creation. Check account access and amount before starting a new link.'
            : 'Creation could not be confirmed. Refresh or retry this same reference; no second link has been created by the application.',
        },
      });
      throw failure;
    }
  }

  async retry(userId: string, id: string) {
    const link = await this.owned(userId, id);
    if (terminal(link.state) || link.state === 'ACTIVE' || link.state === 'CANCELLING')
      return this.detail(userId, id);
    if (!link.connection.enabled)
      throw new ConflictException('Enable the saved connection before retrying creation.');
    const claimed = await this.prisma.gatewayLink.updateMany({
      where: {
        id,
        userId,
        state: link.state,
        createAttemptedAt: link.createAttemptedAt,
        OR: [{ state: 'UNKNOWN' }, { createAttemptedAt: { lt: new Date(Date.now() - 30000) } }],
      },
      data: { state: 'PENDING', createAttemptedAt: new Date(), lastError: null },
    });
    if (!claimed.count)
      throw new ConflictException(
        'The existing creation attempt is still being checked. Refresh shortly.',
      );
    await this.sendCreate(link, link.connection, true);
    return this.detail(userId, id);
  }

  private async payments(connection: RazorpayConnection, remote: ProviderLink, known: string[]) {
    return Promise.all(
      [...new Set([...remote.paymentIds, ...known])].map((id) =>
        this.provider.fetchPayment(this.secrets.credentials(connection), id),
      ),
    );
  }

  async refresh(userId: string, id: string, event?: GatewayEvent, paymentHint?: string) {
    const link = await this.owned(userId, id);
    const credentials = this.secrets.credentials(link.connection);
    const remote = link.providerId
      ? await this.provider.fetchLink(credentials, link.providerId)
      : await this.provider.findLink(credentials, { reference_id: link.referenceId });
    if (!remote) {
      if (event)
        throw new ConflictException('Provider link creation is not visible yet. Retry this event.');
      return this.detail(userId, id);
    }
    this.validateLink(link, remote);
    const payments = await this.payments(link.connection, remote, [
      ...link.payments.map((payment) => payment.providerId),
      ...(paymentHint ? [paymentHint] : []),
    ]);
    await this.apply(link, remote, payments, event);
    return this.detail(userId, id);
  }

  async cancel(userId: string, id: string) {
    const link = await this.owned(userId, id);
    if (terminal(link.state)) return this.refresh(userId, id);
    const credentials = this.secrets.credentials(link.connection);
    const remote = link.providerId
      ? await this.provider.fetchLink(credentials, link.providerId)
      : await this.provider.findLink(credentials, { reference_id: link.referenceId });
    if (!remote)
      throw new ConflictException(
        'Creation is still unconfirmed. Refresh or retry the same reference before cancelling.',
      );
    this.validateLink(link, remote);
    await this.prisma.gatewayLink.updateMany({
      where: { id, userId, activeKey: { not: null } },
      data: { state: 'CANCELLING', lastError: null },
    });
    try {
      if (['created', 'partially_paid'].includes(remote.status))
        await this.provider.cancelLink(credentials, remote.id);
    } catch (error) {
      if (!(error instanceof GatewayProviderError && error.definitive)) throw error;
    }
    const current = await this.provider.fetchLink(credentials, remote.id);
    await this.apply(
      link,
      current,
      await this.payments(
        link.connection,
        current,
        link.payments.map((payment) => payment.providerId),
      ),
    );
    return this.detail(userId, id);
  }

  private async apply(
    link: GatewayLink,
    remote: ProviderLink,
    payments: ProviderPayment[],
    event?: GatewayEvent,
  ) {
    this.validateLink(link, remote);
    await this.prisma.$transaction(
      async (tx) => {
        await lockInvoiceRow(tx, link.userId, link.invoiceId);
        const current = await tx.gatewayLink.findUniqueOrThrow({ where: { id: link.id } });
        if (event) {
          const previous = await tx.gatewayWebhookEvent.findUnique({
            where: {
              connectionId_providerEventId: {
                connectionId: event.connectionId,
                providerEventId: event.providerEventId,
              },
            },
          });
          if (previous) {
            if (previous.digest !== event.digest)
              throw new ConflictException('Webhook event ID was reused with a different body.');
            return;
          }
        }
        const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: link.invoiceId } });
        let paid = await paymentBalance(tx, invoice.id, invoice.userId);
        let ledgerChanged = false;
        for (const capture of payments) {
          if (!capture.captured) continue;
          if (
            capture.amount <= 0n ||
            capture.refunds.some(
              (refund) => refund.amount <= 0n || refund.currency !== capture.currency,
            )
          )
            throw invalidProvider();
          const processed = capture.refunds
            .filter((refund) => refund.status === 'processed')
            .reduce((sum, refund) => sum + refund.amount, 0n);
          if (processed > capture.amount) throw invalidProvider();
          let source = await tx.gatewayPayment.findUnique({
            where: {
              connectionId_providerId: { connectionId: link.connectionId, providerId: capture.id },
            },
          });
          if (source) {
            if (
              source.linkId !== link.id ||
              source.receivedMinor !== capture.amount ||
              source.currency !== capture.currency ||
              source.method !== capture.method
            )
              throw new ConflictException('Provider payment does not match its saved source.');
          } else {
            let exception =
              link.mode === 'TEST'
                ? 'TEST_MODE'
                : invoice.status === 'VOIDED'
                  ? 'INVOICE_VOIDED'
                  : invoice.currency !== 'INR' || capture.currency !== 'INR'
                    ? 'CURRENCY_MISMATCH'
                    : capture.method !== 'upi'
                      ? 'UNEXPECTED_METHOD'
                      : remote.orderId && capture.orderId !== remote.orderId
                        ? 'ORDER_MISMATCH'
                        : invoice.status !== 'SENT'
                          ? 'NO_PAYABLE_BALANCE'
                          : null;
            let applied = 0n;
            if (!exception) {
              const balance = savedMinor(invoice.total, invoice.currency) - paid;
              const net = capture.amount - processed;
              applied = net < balance ? net : balance;
              try {
                paidCache(paid + applied, invoice.currency);
              } catch {
                applied = 0n;
                exception = 'PRECISION_REVIEW';
              }
            }
            source = await tx.gatewayPayment.create({
              data: {
                userId: link.userId,
                invoiceId: link.invoiceId,
                linkId: link.id,
                connectionId: link.connectionId,
                providerId: capture.id,
                receivedMinor: capture.amount,
                appliedMinor: applied,
                currency: capture.currency,
                method: capture.method,
                exception,
                providerCreatedAt: capture.createdAt,
              },
            });
            if (applied > 0n) {
              await tx.paymentEntry.create({
                data: {
                  userId: link.userId,
                  invoiceId: link.invoiceId,
                  requestId: `gateway_${source.id}`,
                  requestHash: hash(source.id),
                  kind: 'RAZORPAY',
                  amountMinor: applied,
                  currency: 'INR',
                  paymentDate: new Date(capture.createdAt.toISOString().slice(0, 10)),
                  reference: capture.id,
                  notes: 'Razorpay-verified captured UPI payment.',
                  gatewayPaymentId: source.id,
                },
              });
              paid += applied;
              ledgerChanged = true;
            }
          }
          for (const refund of [...capture.refunds].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
          )) {
            const previous = await tx.gatewayRefund.findUnique({
              where: {
                connectionId_providerId: { connectionId: link.connectionId, providerId: refund.id },
              },
            });
            if (
              previous &&
              (previous.paymentId !== source.id || previous.amountMinor !== refund.amount)
            )
              throw invalidProvider();
            if (previous?.status === 'processed') continue;
            const already =
              (
                await tx.gatewayRefund.aggregate({
                  where: { paymentId: source.id, status: 'processed' },
                  _sum: { amountMinor: true },
                })
              )._sum.amountMinor ?? 0n;
            const applied =
              refund.status === 'processed'
                ? refundApplied(source.receivedMinor, source.appliedMinor, already, refund.amount)
                : 0n;
            const data = { status: refund.status, appliedMinor: applied };
            const saved = previous
              ? await tx.gatewayRefund.update({ where: { id: previous.id }, data })
              : await tx.gatewayRefund.create({
                  data: {
                    ...data,
                    userId: link.userId,
                    invoiceId: link.invoiceId,
                    paymentId: source.id,
                    connectionId: link.connectionId,
                    providerId: refund.id,
                    amountMinor: refund.amount,
                    providerCreatedAt: refund.createdAt,
                  },
                });
            if (applied > 0n) {
              await tx.paymentEntry.create({
                data: {
                  userId: link.userId,
                  invoiceId: link.invoiceId,
                  requestId: `refund_${saved.id}`,
                  requestHash: hash(saved.id),
                  kind: 'REFUND',
                  amountMinor: -applied,
                  currency: 'INR',
                  paymentDate: new Date(new Date().toISOString().slice(0, 10)),
                  reference: refund.id,
                  notes: 'Processed Razorpay refund synchronized; excess funds reduced first.',
                  gatewayRefundId: saved.id,
                },
              });
              paid -= applied;
              ledgerChanged = true;
            }
          }
        }
        const confirmed =
          (
            await tx.gatewayPayment.aggregate({
              where: { linkId: link.id },
              _sum: { receivedMinor: true },
            })
          )._sum.receivedMinor ?? 0n;
        const awaitingCapture = remote.status === 'paid' && confirmed < remote.amountPaid;
        const incoming: GatewayLinkState = awaitingCapture
          ? 'UNKNOWN'
          : remote.status === 'paid'
            ? 'PAID'
            : remote.status === 'cancelled'
              ? 'CANCELLED'
              : remote.status === 'expired'
                ? 'EXPIRED'
                : 'ACTIVE';
        const state = terminal(current.state)
          ? current.state
          : current.state === 'CANCELLING' && incoming === 'ACTIVE'
            ? 'CANCELLING'
            : incoming;
        await tx.gatewayLink.update({
          where: { id: link.id },
          data: {
            providerId: remote.id,
            orderId: current.orderId ?? remote.orderId,
            url: remote.url,
            state,
            activeKey: terminal(state) ? null : current.activeKey,
            synchronizedAt: new Date(),
            lastError: awaitingCapture
              ? 'Payment is reported but capture is not yet confirmed. Refresh shortly.'
              : null,
          },
        });
        if (ledgerChanged) await syncPaidInvoice(tx, invoice);
        if (event) await tx.gatewayWebhookEvent.create({ data: { ...event, outcome: 'SYNCED' } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
