import { ConfigService } from '@nestjs/config';
import { RazorpaySecrets } from './razorpay-secrets';

const key = Buffer.alloc(32, 7).toString('base64');
const secrets = (value?: string) =>
  new RazorpaySecrets(
    new ConfigService(value === undefined ? {} : { RAZORPAY_CREDENTIALS_KEY: value }),
  );
describe('Razorpay credential encryption', () => {
  it('isolates webhook secrets from credential ciphertext', () => {
    const cipher = secrets(key);
    const value = cipher.encrypt('owner', 'TEST', 'webhook-secret', 'webhook');
    expect(cipher.decrypt('owner', 'TEST', value, 'webhook')).toBe('webhook-secret');
    expect(() => cipher.decrypt('owner', 'TEST', value)).toThrow('could not be read');
    expect(() => cipher.decrypt('owner', 'LIVE', value, 'webhook')).toThrow('could not be read');
  });
  it('authenticates credentials and randomizes encryption of the same payload', () => {
    const cipher = secrets(key);
    const first = cipher.encrypt('owner', 'TEST', 'private-key');
    expect(first).not.toContain('private-key');
    expect(cipher.encrypt('owner', 'TEST', 'private-key')).not.toBe(first);
    expect(cipher.decrypt('owner', 'TEST', first)).toBe('private-key');
    expect(() => cipher.decrypt('other', 'TEST', first)).toThrow('could not be read');
    expect(() => cipher.decrypt('owner', 'LIVE', first)).toThrow('could not be read');
    expect(() =>
      secrets(Buffer.alloc(32, 8).toString('base64')).decrypt('owner', 'TEST', first),
    ).toThrow('could not be read');
    const parts = first.split('.');
    parts[3] = `${parts[3].startsWith('A') ? 'B' : 'A'}${parts[3].slice(1)}`;
    expect(() => cipher.decrypt('owner', 'TEST', parts.join('.'))).toThrow('could not be read');
    expect(() => cipher.decrypt('owner', 'TEST', 'invalid')).toThrow('could not be read');
  });
  it('keeps setup unavailable without a key and rejects malformed configuration', () => {
    expect(secrets().available).toBe(false);
    expect(() => secrets().encrypt('owner', 'TEST', 'value')).toThrow('not configured');
    expect(() => secrets('short')).toThrow('32 bytes');
    expect(() => secrets(`${key} `)).toThrow('32 bytes');
    expect(() => secrets(Buffer.alloc(31).toString('base64'))).toThrow('32 bytes');
  });
});
