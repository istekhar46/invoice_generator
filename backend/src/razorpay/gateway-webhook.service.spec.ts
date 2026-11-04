import { createHmac } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { GatewayService } from './gateway.service';
import { GatewayWebhookService } from './gateway-webhook.service';
import { RazorpayProvider } from './razorpay-provider';
import { RazorpaySecrets } from './razorpay-secrets';

describe('Webhook payment routing', () => {
  const secret = 'fictional-webhook-secret';
  const raw = Buffer.from(
    JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_Verified', notes: { invoiceo_link: 'payload-hint' } } },
      },
    }),
  );
  const signature = createHmac('sha256', secret).update(raw).digest('hex');

  function setup(sourceId: string | null, owned = true, recorded = false) {
    const prisma = {
      razorpayConnection: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'connection',
          userId: 'owner',
          mode: 'TEST',
          webhookCiphertext: 'encrypted',
        }),
      },
      gatewayWebhookSecret: { findMany: jest.fn().mockResolvedValue([]) },
      gatewayWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn<Promise<{ id: string }>, [unknown]>().mockResolvedValue({ id: 'event' }),
      },
      gatewayPayment: {
        findUnique: jest.fn().mockResolvedValue(recorded ? { linkId: 'stored-link' } : null),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      gatewayLink: { findFirst: jest.fn().mockResolvedValue(owned ? { id: 'owned-link' } : null) },
    };
    const provider = {
      fetchPayment: jest.fn().mockResolvedValue({ id: 'pay_Verified', sourceId }),
    };
    const gateway = { refresh: jest.fn().mockResolvedValue({}) };
    const secrets = {
      decrypt: jest.fn().mockReturnValue(secret),
      credentials: jest
        .fn()
        .mockReturnValue({ keyId: 'rzp_test_Fictional', keySecret: 'fictional' }),
    };
    const service = new GatewayWebhookService(
      prisma as unknown as PrismaService,
      gateway as unknown as GatewayService,
      secrets as unknown as RazorpaySecrets,
      provider as unknown as RazorpayProvider,
    );
    const receive = () => service.receive('connection', signature, 'evt_verified', raw);
    return { receive, prisma, provider, gateway };
  }

  it('routes an out-of-order capture using provider notes and the owning connection', async () => {
    const { receive, prisma, provider, gateway } = setup('owned-link');
    await expect(receive()).resolves.toEqual({ received: true });
    expect(provider.fetchPayment).toHaveBeenCalledWith(expect.any(Object), 'pay_Verified');
    expect(prisma.gatewayLink.findFirst).toHaveBeenCalledWith({
      where: { connectionId: 'connection', id: 'owned-link' },
      select: { id: true },
    });
    expect(gateway.refresh).toHaveBeenCalledWith(
      'owner',
      'owned-link',
      expect.objectContaining({ event: 'payment.captured' }),
      'pay_Verified',
    );
    expect(prisma.gatewayWebhookEvent.create).not.toHaveBeenCalled();
  });

  it.each([null, 'standalone-probe'])(
    'durably ignores an unrelated source %p',
    async (sourceId) => {
      const { receive, prisma, gateway } = setup(sourceId, false);
      await expect(receive()).resolves.toEqual({ received: true });
      expect(gateway.refresh).not.toHaveBeenCalled();
      const recorded: unknown = prisma.gatewayWebhookEvent.create.mock.calls[0][0];
      expect(recorded).toMatchObject({ data: { connectionId: 'connection', outcome: 'IGNORED' } });
    },
  );

  it('cannot use another connection’s source ID or the webhook payload hint', async () => {
    const { receive, prisma, gateway } = setup('foreign-link', false);
    await receive();
    expect(prisma.gatewayLink.findFirst).toHaveBeenCalledWith({
      where: { connectionId: 'connection', id: 'foreign-link' },
      select: { id: true },
    });
    expect(gateway.refresh).not.toHaveBeenCalled();
  });

  it('uses an already recorded payment association without a remote lookup', async () => {
    const { receive, provider, gateway } = setup(null, false, true);
    await receive();
    expect(provider.fetchPayment).not.toHaveBeenCalled();
    expect(gateway.refresh).toHaveBeenCalledWith(
      'owner',
      'stored-link',
      expect.any(Object),
      'pay_Verified',
    );
  });

  it('ignores a payment already recorded under the owner’s other connection', async () => {
    const { receive, prisma, provider, gateway } = setup(null);
    prisma.gatewayPayment.findFirst.mockResolvedValue({ id: 'other-connection-payment' });
    await expect(receive()).resolves.toEqual({ received: true });
    expect(provider.fetchPayment).not.toHaveBeenCalled();
    expect(gateway.refresh).not.toHaveBeenCalled();
    expect(prisma.gatewayPayment.findFirst).toHaveBeenCalledWith({
      where: { userId: 'owner', providerId: 'pay_Verified', connectionId: { not: 'connection' } },
      select: { id: true },
    });
  });

  it('does not acknowledge or persist an ignored event when the provider read fails', async () => {
    const { receive, provider, prisma } = setup(null);
    provider.fetchPayment.mockRejectedValue(new Error('Provider unavailable'));
    await expect(receive()).rejects.toThrow('Provider unavailable');
    expect(prisma.gatewayWebhookEvent.create).not.toHaveBeenCalled();
  });
});
