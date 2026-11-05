import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { ShareToken } from './share-token';

const key = Buffer.alloc(32, 7).toString('base64');
const jwt = new JwtService();
function service(secret: string = key) {
  return new ShareToken(new ConfigService({ INVOICE_SHARE_SECRET: secret }), jwt);
}
describe('Public invoice capability isolation', () => {
  it('reproduces a purpose-bound share without an account identity or time-based expiry', () => {
    const tokens = service(),
      id = randomBytes(32).toString('base64url');
    const first = tokens.sign(id);
    expect(tokens.sign(id)).toBe(first);
    expect(tokens.read(first)).toBe(id);
    expect(jwt.decode(first)).toEqual({
      sid: id,
      iss: 'invoiceo:invoice-share',
      aud: 'invoiceo:public-invoice',
    });
  });
  it('rejects changed signatures, unrelated account tokens, wrong audiences and unsigned algorithms', () => {
    const tokens = service(),
      id = randomBytes(32).toString('base64url');
    const token = tokens.sign(id);
    const parts = token.split('.');
    const changed = `${parts[0]}.${parts[1]}.${parts[2].startsWith('A') ? 'B' : 'A'}${parts[2].slice(1)}`;
    const invalid = [
      changed,
      jwt.sign({ sub: 'owner' }, { secret: 'account-secret' }),
      jwt.sign(
        { sid: id },
        {
          secret: Buffer.from(key, 'base64'),
          issuer: 'invoiceo:invoice-share',
          audience: 'account',
        },
      ),
      `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sid: id })).toString('base64url')}.`,
      jwt.sign(
        { sid: id, sub: 'owner' },
        {
          secret: Buffer.from(key, 'base64'),
          issuer: 'invoiceo:invoice-share',
          audience: 'invoiceo:public-invoice',
          noTimestamp: true,
        },
      ),
      '',
      'x'.repeat(513),
    ];
    for (const value of invalid) expect(tokens.read(value)).toBeNull();
  });
  it('rejects a share signed by another server key', () => {
    const id = randomBytes(32).toString('base64url');
    expect(service(Buffer.alloc(32, 8).toString('base64')).read(service().sign(id))).toBeNull();
  });
  it('disables missing configuration explicitly, and rejects malformed configuration', () => {
    expect(service('').available).toBe(false);
    expect(() => service('').sign('id')).toThrow('not configured');
    expect(() => service('').read('value')).toThrow('not configured');
    for (const value of ['bad', key + ' ', Buffer.alloc(16).toString('base64')])
      expect(() => service(value)).toThrow('canonical base64');
  });
});
