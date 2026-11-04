import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { RazorpayMode } from '@prisma/client';
import type { RazorpayCredentials } from './razorpay-provider';

@Injectable()
export class RazorpaySecrets {
  private readonly key: Buffer | undefined;

  constructor(config: ConfigService) {
    const encoded = config.get<string>('RAZORPAY_CREDENTIALS_KEY');
    if (encoded !== undefined && encoded !== '') {
      const key = Buffer.from(encoded, 'base64');
      if (key.length !== 32 || key.toString('base64') !== encoded)
        throw new Error('RAZORPAY_CREDENTIALS_KEY must be exactly 32 bytes in canonical base64.');
      this.key = key;
    }
  }

  get available() {
    return this.key !== undefined;
  }

  private requireKey() {
    if (!this.key)
      throw new ServiceUnavailableException(
        'Payment account setup is not configured on this server.',
      );
    return this.key;
  }

  credentials(connection: {
    userId: string;
    mode: RazorpayMode;
    encryptedCredentials: string;
  }): RazorpayCredentials {
    return JSON.parse(
      this.decrypt(connection.userId, connection.mode, connection.encryptedCredentials),
    ) as RazorpayCredentials;
  }

  encrypt(
    userId: string,
    mode: RazorpayMode,
    value: string,
    purpose: 'credentials' | 'webhook' = 'credentials',
  ) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.requireKey(), iv);
    cipher.setAAD(
      Buffer.from(
        JSON.stringify([purpose === 'credentials' ? 'razorpay' : 'razorpay-webhook', userId, mode]),
      ),
    );
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [
      'v1',
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(
    userId: string,
    mode: RazorpayMode,
    value: string,
    purpose: 'credentials' | 'webhook' = 'credentials',
  ) {
    const key = this.requireKey();
    try {
      const parts = value.split('.');
      if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid envelope');
      const iv = Buffer.from(parts[1], 'base64url');
      const tag = Buffer.from(parts[2], 'base64url');
      if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid envelope');
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAAD(
        Buffer.from(
          JSON.stringify([
            purpose === 'credentials' ? 'razorpay' : 'razorpay-webhook',
            userId,
            mode,
          ]),
        ),
      );
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(Buffer.from(parts[3], 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException(
        'Stored payment credentials could not be read. Contact the administrator.',
      );
    }
  }
}
