import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

const issuer = 'invoiceo:invoice-share';
const audience = 'invoiceo:public-invoice';
export const shareIdPattern = /^[A-Za-z0-9_-]{43}$/;

/** Separate capability key/purpose; these tokens never authenticate an account. */
@Injectable()
export class ShareToken {
  private readonly key: Buffer | undefined;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    const encoded = config.get<string>('INVOICE_SHARE_SECRET');
    if (encoded) {
      const key = Buffer.from(encoded, 'base64');
      if (key.length !== 32 || key.toString('base64') !== encoded)
        throw new Error('INVOICE_SHARE_SECRET must be exactly 32 bytes in canonical base64.');
      this.key = key;
    }
  }

  get available() {
    return this.key !== undefined;
  }

  private requireKey() {
    if (!this.key)
      throw new ServiceUnavailableException('Invoice sharing is not configured on this server.');
    return this.key;
  }

  sign(id: string) {
    return this.jwt.sign(
      { sid: id },
      { secret: this.requireKey(), algorithm: 'HS256', issuer, audience, noTimestamp: true },
    );
  }

  read(value: string): string | null {
    const secret = this.requireKey();
    if (!value || value.length > 512) return null;
    try {
      const payload: unknown = this.jwt.verify(value, {
        secret,
        algorithms: ['HS256'],
        issuer,
        audience,
      });
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
      const claims = payload as Record<string, unknown>;
      return typeof claims.sid === 'string' &&
        shareIdPattern.test(claims.sid) &&
        Object.keys(claims).every((key) => ['sid', 'iss', 'aud'].includes(key))
        ? claims.sid
        : null;
    } catch {
      return null;
    }
  }
}
