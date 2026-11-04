// Controlled provider state for real HTTP/DB tests; never contacts Razorpay.
const { GatewayProviderError } = require('../dist/razorpay/razorpay-provider');
class GatewayProviderFixture {
  constructor() {
    this.links = new Map();
    this.payments = new Map();
    this.created = 0;
    this.nextCreateFailure = null;
    this.pause = null;
    this.entered = null;
    this.nextPayment = 0;
    this.nextRefund = 0;
  }
  async verify(credentials) {
    if (credentials.keySecret === 'rejected') throw new GatewayProviderError(true);
  }
  own(credentials, row) {
    if (!row || row.key !== credentials.keyId) throw new GatewayProviderError(true);
    return row;
  }
  value(row) {
    const { key, ...value } = row;
    return structuredClone(value);
  }
  async createLink(credentials, referenceId, sourceId, amount) {
    if (this.nextCreateFailure === 'rejected') {
      this.nextCreateFailure = null;
      throw new GatewayProviderError(true);
    }
    if (
      [...this.links.values()].some(
        (row) => row.key === credentials.keyId && row.referenceId === referenceId,
      )
    )
      throw new GatewayProviderError(true);
    const id = `plink_Fixture${++this.created}`;
    const row = {
      key: credentials.keyId,
      id,
      referenceId,
      sourceId,
      amount,
      amountPaid: 0n,
      currency: 'INR',
      status: 'created',
      url: `https://rzp.io/i/Fixture${this.created}`,
      orderId: `order_Fixture${this.created}`,
      paymentIds: [],
    };
    this.links.set(id, row);
    if (this.entered) this.entered();
    if (this.pause) await this.pause;
    if (this.nextCreateFailure === 'uncertain') {
      this.nextCreateFailure = null;
      throw new GatewayProviderError(false);
    }
    return this.value(row);
  }
  async findLink(credentials, filter) {
    const rows = [...this.links.values()].filter(
      (row) =>
        row.key === credentials.keyId &&
        (filter.reference_id
          ? row.referenceId === filter.reference_id
          : row.paymentIds.includes(filter.payment_id)),
    );
    if (rows.length > 1) throw Error('Fixture reference collision');
    return rows[0] ? this.value(rows[0]) : null;
  }
  async fetchLink(credentials, id) {
    return this.value(this.own(credentials, this.links.get(id)));
  }
  async cancelLink(credentials, id) {
    const row = this.own(credentials, this.links.get(id));
    if (row.status === 'paid') throw new GatewayProviderError(true);
    row.status = 'cancelled';
  }
  async fetchPayment(credentials, id) {
    return this.value(this.own(credentials, this.payments.get(id)));
  }
  capture(linkId, amount, extra = {}) {
    const link = this.links.get(linkId);
    const id = `pay_Fixture${++this.nextPayment}`;
    const payment = {
      key: link.key,
      id,
      amount,
      currency: 'INR',
      method: 'upi',
      orderId: link.orderId,
      captured: true,
      createdAt: new Date('2026-11-04T06:00:00Z'),
      refunds: [],
      ...extra,
    };
    this.payments.set(id, payment);
    link.paymentIds.push(id);
    link.amountPaid += amount;
    link.status = 'paid';
    return payment;
  }
  refund(paymentId, amount, status = 'processed') {
    const payment = this.payments.get(paymentId);
    const refund = {
      id: `rfnd_Fixture${++this.nextRefund}`,
      paymentId,
      amount,
      currency: payment.currency,
      status,
      createdAt: new Date('2026-11-04T07:00:00Z'),
    };
    payment.refunds.push(refund);
    return refund;
  }
}
module.exports = { GatewayProviderFixture };
