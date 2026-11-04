import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { GatewayEvent, GatewayService } from './gateway.service';
import { RazorpaySecrets } from './razorpay-secrets';
import { RazorpayProvider } from './razorpay-provider';

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const entity = (payload: Record<string, unknown>, name: string) =>
  record(record(payload[name]).entity);

@Injectable()
export class GatewayWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: GatewayService,
    private readonly secrets: RazorpaySecrets,
    private readonly provider: RazorpayProvider,
  ) {}

  async receive(
    connectionId: string,
    signature: string | undefined,
    eventId: string | undefined,
    raw: Buffer | undefined,
  ) {
    if (!raw || !signature || !/^[a-fA-F0-9]{64}$/.test(signature))
      throw new UnauthorizedException('A valid Razorpay webhook signature is required.');
    if (!eventId || !/^[A-Za-z0-9_-]{1,200}$/.test(eventId))
      throw new BadRequestException('A valid Razorpay event ID is required.');
    const connection = await this.prisma.razorpayConnection.findUnique({
      where: { id: connectionId },
    });
    if (!connection?.webhookCiphertext)
      throw new NotFoundException('Webhook connection is not configured.');
    const candidates = [
      connection.webhookCiphertext,
      ...(
        await this.prisma.gatewayWebhookSecret.findMany({
          where: { connectionId, expiresAt: { gt: new Date() } },
          select: { ciphertext: true },
        })
      ).map((secret) => secret.ciphertext),
    ];
    const valid = candidates.some((cipher) =>
      timingSafeEqual(
        Buffer.from(signature, 'hex'),
        createHmac(
          'sha256',
          this.secrets.decrypt(connection.userId, connection.mode, cipher, 'webhook'),
        )
          .update(raw)
          .digest(),
      ),
    );
    if (!valid) throw new UnauthorizedException('Invalid Razorpay webhook signature.');
    const digest = createHash('sha256').update(raw).digest('hex');
    const prior = await this.prisma.gatewayWebhookEvent.findUnique({
      where: { connectionId_providerEventId: { connectionId, providerEventId: eventId } },
    });
    if (prior) {
      if (prior.digest !== digest)
        throw new ConflictException('Webhook event ID was reused with a different body.');
      return { received: true, duplicate: true };
    }
    let body: Record<string, unknown>;
    try {
      body = record(JSON.parse(raw.toString('utf8')));
    } catch {
      throw new BadRequestException('Invalid webhook JSON.');
    }
    const eventName = typeof body.event === 'string' && body.event.length <= 100 ? body.event : '';
    if (!eventName) throw new BadRequestException('Webhook event type is missing.');
    const event: GatewayEvent = {
      connectionId,
      providerEventId: eventId,
      digest,
      event: eventName,
    };
    const supported = [
      'payment_link.paid',
      'payment_link.partially_paid',
      'payment_link.cancelled',
      'payment_link.expired',
      'payment.captured',
      'refund.created',
      'refund.processed',
      'refund.failed',
    ];
    const payload = record(body.payload);
    let target: null | { id: string } = null;
    let paymentHint: string | undefined;
    if (supported.includes(eventName)) {
      const linkId = entity(payload, 'payment_link').id;
      if (typeof linkId === 'string')
        target = await this.prisma.gatewayLink.findFirst({
          where: { connectionId, providerId: linkId },
          select: { id: true },
        });
      const paymentId = entity(payload, 'payment').id ?? entity(payload, 'refund').payment_id;
      if (!target && typeof paymentId === 'string' && /^pay_[A-Za-z0-9]+$/.test(paymentId)) {
        const payment = await this.prisma.gatewayPayment.findUnique({
          where: { connectionId_providerId: { connectionId, providerId: paymentId } },
          select: { linkId: true },
        });
        if (payment) {
          target = { id: payment.linkId };
          paymentHint = paymentId;
        } else {
          const remote = await this.provider.findLink(this.secrets.credentials(connection), {
            payment_id: paymentId,
          });
          if (remote)
            target = await this.prisma.gatewayLink.findFirst({
              where: {
                connectionId,
                OR: [{ providerId: remote.id }, { referenceId: remote.referenceId }],
              },
              select: { id: true },
            });
          if (target) paymentHint = paymentId;
        }
      }
    }
    if (target) await this.gateway.refresh(connection.userId, target.id, event, paymentHint);
    else {
      try {
        await this.prisma.gatewayWebhookEvent.create({ data: { ...event, outcome: 'IGNORED' } });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'))
          throw error;
        const previous = await this.prisma.gatewayWebhookEvent.findUniqueOrThrow({
          where: { connectionId_providerEventId: { connectionId, providerEventId: eventId } },
        });
        if (previous.digest !== digest)
          throw new ConflictException('Webhook event ID was reused with a different body.');
      }
    }
    return { received: true };
  }
}
