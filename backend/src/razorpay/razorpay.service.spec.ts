import { RazorpayService } from './razorpay.service';
import type { PrismaService } from '../database/prisma.service';
import type { RazorpaySecrets } from './razorpay-secrets';
import type { RazorpayProvider } from './razorpay-provider';

describe('Razorpay setup receipt metadata', () => {
  const time = new Date('2026-11-05T08:00:00Z');
  const connection = {
    id: 'test-connection',
    userId: 'owner-a',
    mode: 'TEST',
    keySuffix: '1234',
    enabled: true,
    encryptedCredentials: 'private-credentials',
    webhookCiphertext: 'private-webhook-secret',
    validatedAt: time,
    updatedAt: time,
    webhookEvents: [{ createdAt: time, event: 'payment.captured', outcome: 'SYNCED' }],
  };
  const findMany = jest.fn();
  const service = new RazorpayService(
    { razorpayConnection: { findMany } } as unknown as PrismaService,
    { available: true } as RazorpaySecrets,
    {} as RazorpayProvider,
  );
  beforeEach(() => findMany.mockReset());

  it('returns restricted receipt metadata only through owned connections', async () => {
    findMany.mockResolvedValue([connection]);
    const result = await service.list('owner-a');
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'owner-a' },
      orderBy: { mode: 'desc' },
      include: {
        webhookEvents: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: { createdAt: true, event: true, outcome: true },
        },
      },
    });
    expect(result.connections[0].lastWebhook).toEqual({
      receivedAt: time,
      event: 'payment.captured',
      outcome: 'SYNCED',
    });
    expect(JSON.stringify(result)).not.toMatch(
      /private-|encryptedCredentials|webhookCiphertext|providerEventId|digest/,
    );
  });

  it('does not confuse a saved secret with webhook delivery', async () => {
    findMany.mockResolvedValue([{ ...connection, webhookEvents: [] }]);
    const result = await service.list('owner-a');
    expect(result.connections[0].hasWebhookSecret).toBe(true);
    expect(result.connections[0].lastWebhook).toBeNull();
  });

  it('retains ignored signed callbacks as receipt evidence without labelling them synced', async () => {
    findMany.mockResolvedValue([
      {
        ...connection,
        webhookEvents: [{ createdAt: time, event: 'unhandled.event', outcome: 'IGNORED' }],
      },
    ]);
    const result = await service.list('owner-a');
    expect(result.connections[0].lastWebhook).toEqual({
      receivedAt: time,
      event: 'unhandled.event',
      outcome: 'IGNORED',
    });
  });
});
