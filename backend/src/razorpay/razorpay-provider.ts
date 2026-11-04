import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import {
  ProviderLink,
  ProviderPayment,
  ProviderRefund,
  invalidProvider,
  minor,
  object,
  parseLink,
  providerDate,
  providerId,
  text,
} from './gateway-provider.types';
// SDK uses export=; this CommonJS project does not enable esModuleInterop.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Razorpay = require('razorpay');

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

export class GatewayProviderError extends HttpException {
  constructor(readonly definitive: boolean) {
    super(
      definitive
        ? 'Razorpay rejected this request. Check your account, payment amount and API access, then refresh.'
        : 'Razorpay could not confirm the request. Refresh the link before retrying.',
      definitive ? 400 : 503,
    );
  }
}

export function upiLinkRequest(referenceId: string, sourceId: string, amount: bigint) {
  return {
    amount: Number(amount),
    currency: 'INR',
    accept_partial: false,
    reference_id: referenceId,
    description: 'Invoice payment',
    customer: { name: 'Invoice customer' },
    notify: { sms: false, email: false, whatsapp: false },
    reminder_enable: false,
    notes: { invoiceo_link: sourceId },
    options: {
      checkout: {
        method: {
          upi: true,
          card: false,
          netbanking: false,
          wallet: false,
          emi: false,
          paylater: false,
        },
        config: {
          display: {
            blocks: { upi: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] } },
            sequence: ['block.upi'],
            preferences: { show_default_blocks: false },
          },
        },
      },
    },
  };
}

@Injectable()
export class RazorpayProvider {
  private async request<T>(
    credentials: RazorpayCredentials,
    run: (client: Razorpay) => Promise<T>,
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const client = new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret });
      return await Promise.race([
        run(client),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            reject(new Error('Provider deadline'));
          }, 7000);
        }),
      ]);
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : 0;
      throw new GatewayProviderError(status >= 400 && status < 500 && status !== 429);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async createLink(
    credentials: RazorpayCredentials,
    referenceId: string,
    sourceId: string,
    amount: bigint,
  ): Promise<ProviderLink> {
    const value = await this.request(credentials, (client) =>
      client.paymentLink.create(upiLinkRequest(referenceId, sourceId, amount)),
    );
    return parseLink(value);
  }

  async fetchLink(credentials: RazorpayCredentials, id: string): Promise<ProviderLink> {
    return parseLink(await this.request(credentials, (client) => client.paymentLink.fetch(id)));
  }

  async findLink(
    credentials: RazorpayCredentials,
    filter: { reference_id?: string; payment_id?: string },
  ): Promise<ProviderLink | null> {
    // SDK forwards additional documented filters despite omitting them in its pagination type.
    const params = { ...filter, count: 2 };
    const value = await this.request(credentials, (client) => client.paymentLink.all(params));
    const rows = object(value).payment_links;
    if (!Array.isArray(rows) || rows.length > 1) throw invalidProvider();
    return rows[0] ? parseLink(rows[0]) : null;
  }

  async cancelLink(credentials: RazorpayCredentials, id: string): Promise<void> {
    await this.request(credentials, (client) => client.paymentLink.cancel(id));
  }

  async fetchPayment(credentials: RazorpayCredentials, id: string): Promise<ProviderPayment> {
    const row = object(await this.request(credentials, (client) => client.payments.fetch(id)));
    if (providerId(row.id, 'pay') !== id) throw invalidProvider();
    const status = text(row.status);
    if (!['created', 'authorized', 'captured', 'refunded', 'failed'].includes(status))
      throw invalidProvider();
    const captured = row.captured === true && ['captured', 'refunded'].includes(status);
    const refunds: ProviderRefund[] = [];
    const seen = new Set<string>();
    if (captured)
      for (let skip = 0; ; skip += 100) {
        const value = await this.request(credentials, (client) =>
          client.payments.fetchMultipleRefund(id, { count: 100, skip }),
        );
        const rows = object(value).items;
        if (!Array.isArray(rows)) throw invalidProvider();
        for (const item of rows) {
          const refund = object(item);
          const refundId = providerId(refund.id, 'rfnd');
          if (
            seen.has(refundId) ||
            refund.payment_id !== id ||
            !['pending', 'processed', 'failed'].includes(String(refund.status))
          )
            throw invalidProvider();
          seen.add(refundId);
          refunds.push({
            id: refundId,
            paymentId: id,
            amount: minor(refund.amount),
            currency: text(refund.currency, 3),
            status: refund.status as ProviderRefund['status'],
            createdAt: providerDate(refund.created_at),
          });
        }
        if (rows.length < 100) break;
      }
    return {
      id,
      amount: minor(row.amount),
      currency: text(row.currency, 3),
      method: text(row.method, 32),
      orderId: row.order_id ? providerId(row.order_id, 'order') : null,
      captured,
      createdAt: providerDate(row.created_at),
      refunds,
    };
  }
  /** Read-only credential check. Never creates a link, notification or payment. */
  async verify(credentials: RazorpayCredentials): Promise<void> {
    const client = new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret });
    let timer: NodeJS.Timeout | undefined;
    try {
      // SDK 2.9.8 has no public timeout/AbortSignal option. Bound this read-only
      // check; a late SDK response cannot continue into a credential save.
      await Promise.race([
        client.paymentLink.all({ count: 1 }),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            reject(new Error('Provider deadline'));
          }, 7000);
        }),
      ]);
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : 0;
      if ([400, 401, 403].includes(status))
        throw new BadRequestException(
          'Razorpay did not accept these credentials. Check the selected mode and API keys.',
        );
      // Do not attach/log SDK errors: they can contain request authentication.
      throw new ServiceUnavailableException(
        'Razorpay could not be reached for verification. Please try again.',
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
