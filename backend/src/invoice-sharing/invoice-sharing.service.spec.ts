import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { ShareToken } from './share-token';
import { InvoiceSharingService } from './invoice-sharing.service';

it('keeps private database errors out of the anonymous response', async () => {
  const tokens = new ShareToken(
    new ConfigService({ INVOICE_SHARE_SECRET: Buffer.alloc(32, 19).toString('base64') }),
    new JwtService(),
  );
  const prisma = {
    $transaction: jest.fn().mockRejectedValue(new Error('private database/query detail')),
  } as unknown as PrismaService;
  const service = new InvoiceSharingService(prisma, tokens);
  await expect(
    service.read(`Bearer ${tokens.sign(randomBytes(32).toString('base64url'))}`),
  ).rejects.toMatchObject({
    status: 503,
    message: 'Invoice sharing is temporarily unavailable. Please try again.',
  });
});
