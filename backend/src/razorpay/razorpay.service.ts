import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RazorpayConnection, RazorpayMode } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RazorpaySecrets } from './razorpay-secrets';
import { RazorpayProvider } from './razorpay-provider';
import { SaveRazorpayConnectionDto } from './razorpay.dto';

function metadata(connection: RazorpayConnection) {
  return {
    id: connection.id,
    mode: connection.mode,
    maskedKeyId: `rzp_${connection.mode.toLowerCase()}_…${connection.keySuffix}`,
    enabled: connection.enabled,
    validatedAt: connection.validatedAt,
    updatedAt: connection.updatedAt,
    hasWebhookSecret: connection.webhookCiphertext !== null,
    webhookPath: `/api/v1/razorpay/webhooks/${connection.id}`,
  };
}

@Injectable()
export class RazorpayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: RazorpaySecrets,
    private readonly provider: RazorpayProvider,
  ) {}

  async list(userId: string) {
    const connections = await this.prisma.razorpayConnection.findMany({
      where: { userId },
      orderBy: { mode: 'desc' },
    });
    return { setupAvailable: this.secrets.available, connections: connections.map(metadata) };
  }

  async save(userId: string, mode: RazorpayMode, dto: SaveRazorpayConnectionDto) {
    if (!dto.keyId.startsWith(`rzp_${mode.toLowerCase()}_`))
      throw new BadRequestException('The API key does not match the selected Razorpay mode.');
    // Validate encryption availability before calling the provider. Never change
    // an existing saved connection when verification or persistence fails.
    const existing = await this.prisma.razorpayConnection.findUnique({
      where: { userId_mode: { userId, mode } },
    });
    const encryptedCredentials = this.secrets.encrypt(
      userId,
      mode,
      JSON.stringify({ keyId: dto.keyId, keySecret: dto.keySecret }),
    );
    await this.provider.verify(dto);
    // New keys must retain access to this merchant's existing provider links.
    let proof = existing
      ? await this.prisma.gatewayLink.findFirst({
          where: { connectionId: existing.id, providerId: { not: null } },
          orderBy: { createdAt: 'desc' },
          select: { id: true, providerId: true, referenceId: true, amountMinor: true },
        })
      : null;
    if (existing && !proof)
      proof = await this.prisma.gatewayLink.findFirst({
        where: { connectionId: existing.id, activeKey: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, providerId: true, referenceId: true, amountMinor: true },
      });
    if (proof) {
      // Recovery must still work if keys were rotated after a lost create response.
      const remote = proof.providerId
        ? await this.provider.fetchLink(dto, proof.providerId)
        : await this.provider.findLink(dto, { reference_id: proof.referenceId });
      if (
        !remote ||
        (proof.providerId
          ? remote.id !== proof.providerId
          : remote.referenceId !== proof.referenceId ||
            remote.sourceId !== proof.id ||
            remote.amount !== proof.amountMinor ||
            remote.currency !== 'INR')
      )
        throw new ConflictException(
          'Replacement keys must retain access to this merchant’s saved link. Refresh its reference or use keys for the same Razorpay account.',
        );
    }
    const data = {
      encryptedCredentials,
      keySuffix: dto.keyId.slice(-4),
      validatedAt: new Date(),
      enabled: true,
    };
    return this.prisma.$transaction(async (tx) => {
      if (!existing) {
        // A racing first setup is rejected by the account/mode unique key.
        return metadata(await tx.razorpayConnection.create({ data: { userId, mode, ...data } }));
      }
      await tx.$queryRaw`SELECT id FROM razorpay_connections WHERE id=${existing.id} AND "userId"=${userId} FOR UPDATE`;
      if (
        !proof &&
        (await tx.gatewayLink.count({
          where: {
            connectionId: existing.id,
            OR: [{ providerId: { not: null } }, { activeKey: { not: null } }],
          },
        }))
      )
        throw new ConflictException(
          'Link history changed during verification. Refresh and verify keys for the same merchant again.',
        );
      const changed = await tx.razorpayConnection.updateMany({
        where: { id: existing.id, userId, version: existing.version },
        data: { ...data, version: { increment: 1 } },
      });
      if (!changed.count)
        throw new ConflictException(
          'The connection changed during verification. Reload and try again.',
        );
      return metadata(
        await tx.razorpayConnection.findUniqueOrThrow({ where: { id: existing.id } }),
      );
    });
  }

  async verify(userId: string, mode: RazorpayMode) {
    const connection = await this.prisma.razorpayConnection.findUnique({
      where: { userId_mode: { userId, mode } },
    });
    if (!connection) throw new NotFoundException('No Razorpay connection exists for this mode.');
    const credentials = this.secrets.credentials(connection);
    await this.provider.verify(credentials);
    // A concurrent disable/replacement must not be undone by an earlier check.
    const result = await this.prisma.razorpayConnection.updateMany({
      where: { id: connection.id, userId, version: connection.version },
      data: { enabled: true, validatedAt: new Date(), version: { increment: 1 } },
    });
    if (!result.count)
      throw new ConflictException(
        'The connection changed during verification. Reload and try again.',
      );
    const updated = await this.prisma.razorpayConnection.findUniqueOrThrow({
      where: { id: connection.id },
    });
    return metadata(updated);
  }

  async disable(userId: string, mode: RazorpayMode) {
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM razorpay_connections WHERE "userId"=${userId} AND mode=${mode}::"RazorpayMode" FOR UPDATE`;
      if (!rows[0]) throw new NotFoundException('No Razorpay connection exists for this mode.');
      if (
        await tx.gatewayLink.count({
          where: { connectionId: rows[0].id, activeKey: { not: null } },
        })
      )
        throw new ConflictException(
          'Cancel or resolve active payment links before disabling this connection.',
        );
      await tx.razorpayConnection.update({
        where: { id: rows[0].id },
        data: { enabled: false, version: { increment: 1 } },
      });
    });
    return { disabled: true };
  }

  async webhook(userId: string, mode: RazorpayMode, secret: string) {
    const connection = await this.prisma.razorpayConnection.findUnique({
      where: { userId_mode: { userId, mode } },
    });
    if (!connection)
      throw new NotFoundException('Connect this Razorpay mode before configuring webhooks.');
    const ciphertext = this.secrets.encrypt(userId, mode, secret, 'webhook');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM razorpay_connections WHERE id=${connection.id} AND "userId"=${userId} FOR UPDATE`;
      const current = await tx.razorpayConnection.findUniqueOrThrow({
        where: { id: connection.id },
      });
      if (
        current.webhookCiphertext &&
        this.secrets.decrypt(userId, mode, current.webhookCiphertext, 'webhook') === secret
      )
        return metadata(current);
      if (current.webhookCiphertext)
        await tx.gatewayWebhookSecret.create({
          data: {
            connectionId: current.id,
            ciphertext: current.webhookCiphertext,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      await tx.gatewayWebhookSecret.deleteMany({
        where: { connectionId: current.id, expiresAt: { lte: new Date() } },
      });
      return metadata(
        await tx.razorpayConnection.update({
          where: { id: current.id },
          data: { webhookCiphertext: ciphertext, version: { increment: 1 } },
        }),
      );
    });
  }
}
