/** Pure invoice arithmetic, shared by the API and browser. No framework imports. */
export type DiscountType = 'percentage' | 'fixed';

export interface InvoicePricing {
  currency?: string;
  discountType?: string;
  discountValue?: number;
  shippingAmount?: number;
  amountPaid?: number;
}

export interface CalculatedInvoice {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  balanceDue: number;
}

/** The persisted financial snapshot remains authoritative until pricing changes. */
export interface InvoiceSnapshot extends InvoicePricing {
  lineItems: readonly { quantity: number; rate: number; amount: number }[];
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export class CalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculationError';
  }
}

export const SUPPORTED_CURRENCIES: readonly string[] = [
  'AED',
  'AFN',
  'ALL',
  'AMD',
  'ANG',
  'AOA',
  'ARS',
  'AUD',
  'AWG',
  'AZN',
  'BAM',
  'BBD',
  'BDT',
  'BGN',
  'BHD',
  'BIF',
  'BMD',
  'BND',
  'BOB',
  'BRL',
  'BSD',
  'BTN',
  'BWP',
  'BYN',
  'BZD',
  'CAD',
  'CDF',
  'CHF',
  'CLP',
  'CNY',
  'COP',
  'CRC',
  'CUC',
  'CUP',
  'CVE',
  'CZK',
  'DJF',
  'DKK',
  'DOP',
  'DZD',
  'EGP',
  'ERN',
  'ETB',
  'EUR',
  'FJD',
  'FKP',
  'GBP',
  'GEL',
  'GHS',
  'GIP',
  'GMD',
  'GNF',
  'GTQ',
  'GYD',
  'HKD',
  'HNL',
  'HRK',
  'HTG',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'IQD',
  'IRR',
  'ISK',
  'JMD',
  'JOD',
  'JPY',
  'KES',
  'KGS',
  'KHR',
  'KMF',
  'KPW',
  'KRW',
  'KWD',
  'KYD',
  'KZT',
  'LAK',
  'LBP',
  'LKR',
  'LRD',
  'LSL',
  'LYD',
  'MAD',
  'MDL',
  'MGA',
  'MKD',
  'MMK',
  'MNT',
  'MOP',
  'MRU',
  'MUR',
  'MVR',
  'MWK',
  'MXN',
  'MYR',
  'MZN',
  'NAD',
  'NGN',
  'NIO',
  'NOK',
  'NPR',
  'NZD',
  'OMR',
  'PAB',
  'PEN',
  'PGK',
  'PHP',
  'PKR',
  'PLN',
  'PYG',
  'QAR',
  'RON',
  'RSD',
  'RUB',
  'RWF',
  'SAR',
  'SBD',
  'SCR',
  'SDG',
  'SEK',
  'SGD',
  'SHP',
  'SLE',
  'SLL',
  'SOS',
  'SRD',
  'SSP',
  'STN',
  'SVC',
  'SYP',
  'SZL',
  'THB',
  'TJS',
  'TMT',
  'TND',
  'TOP',
  'TRY',
  'TTD',
  'TWD',
  'TZS',
  'UAH',
  'UGX',
  'USD',
  'UYU',
  'UZS',
  'VES',
  'VND',
  'VUV',
  'WST',
  'XAF',
  'XCD',
  'XCG',
  'XDR',
  'XOF',
  'XPF',
  'XSU',
  'YER',
  'ZAR',
  'ZMW',
  'ZWG',
  'ZWL',
];

export function currencyDigits(currency = 'USD'): number {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new CalculationError('Choose a supported currency.');
  }
  const { maximumFractionDigits } = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions();
  if (maximumFractionDigits === undefined)
    throw new CalculationError('Currency precision is unavailable.');
  return maximumFractionDigits;
}

function minorUnits(value: number, currency = 'USD'): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new CalculationError('Money amounts must be finite numbers.');
  }
  const factor = 10 ** currencyDigits(currency);
  const scaled = Math.round((Math.abs(value) + Number.EPSILON * Math.abs(value)) * factor);
  if (!Number.isSafeInteger(scaled)) {
    throw new CalculationError('Invoice amount is too large.');
  }
  return scaled === 0 ? 0 : Math.sign(value) * scaled;
}

/** Convert an amount to rounded currency units, with halves away from zero. */
export function money(value: number, currency = 'USD'): number {
  return minorUnits(value, currency) / 10 ** currencyDigits(currency);
}

function nonnegative(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new CalculationError(`${label} must be a finite, non-negative number.`);
  }
}

export function paymentBalance(total: number, amountPaid: number, currency = 'USD'): number {
  nonnegative(total, 'Total');
  nonnegative(amountPaid, 'Amount paid');
  const totalUnits = minorUnits(total, currency);
  const paidUnits = minorUnits(amountPaid, currency);
  if (paidUnits > totalUnits)
    throw new CalculationError('Amount paid cannot exceed the invoice total.');
  return (totalUnits - paidUnits) / 10 ** currencyDigits(currency);
}

export function invoicePricingChanged(
  items: readonly { quantity: number; rate: number }[],
  taxRate: number,
  pricing: InvoicePricing,
  original: InvoiceSnapshot,
): boolean {
  return (
    taxRate !== original.taxRate ||
    (pricing.currency ?? 'USD') !== (original.currency ?? 'USD') ||
    (pricing.discountType ?? 'percentage') !== (original.discountType ?? 'percentage') ||
    (pricing.discountValue ?? 0) !== (original.discountValue ?? 0) ||
    (pricing.shippingAmount ?? 0) !== (original.shippingAmount ?? 0) ||
    items.length !== original.lineItems.length ||
    items.some(
      (item, index) =>
        item.quantity !== original.lineItems[index].quantity ||
        item.rate !== original.lineItems[index].rate,
    )
  );
}

export function calculateInvoice(
  items: readonly { quantity: number; rate: number }[],
  taxRate: number,
  pricing: InvoicePricing = {},
): CalculatedInvoice {
  const {
    currency = 'USD',
    discountType = 'percentage',
    discountValue = 0,
    shippingAmount = 0,
    amountPaid = 0,
  } = pricing;
  const factor = 10 ** currencyDigits(currency);
  nonnegative(taxRate, 'Tax rate');
  nonnegative(discountValue, 'Discount');
  nonnegative(shippingAmount, 'Shipping');
  nonnegative(amountPaid, 'Amount paid');
  if (taxRate > 1) throw new CalculationError('Tax rate cannot exceed 100%.');
  if (!['percentage', 'fixed'].includes(discountType)) {
    throw new CalculationError('Choose percentage or fixed discount.');
  }
  if (discountType === 'percentage' && discountValue > 100) {
    throw new CalculationError('Discount cannot exceed 100%.');
  }
  const subtotalUnits = items.reduce((sum, item) => {
    nonnegative(item.quantity, 'Quantity');
    nonnegative(item.rate, 'Rate');
    return sum + minorUnits(item.quantity * item.rate, currency);
  }, 0);
  if (!Number.isSafeInteger(subtotalUnits))
    throw new CalculationError('Invoice amount is too large.');
  const discountUnits =
    discountType === 'percentage'
      ? Math.round((subtotalUnits * discountValue) / 100)
      : minorUnits(discountValue, currency);
  if (discountUnits > subtotalUnits) throw new CalculationError('Discount cannot exceed subtotal.');
  const taxUnits = Math.round((subtotalUnits - discountUnits) * taxRate);
  const totalUnits =
    subtotalUnits - discountUnits + taxUnits + minorUnits(shippingAmount, currency);
  if (!Number.isSafeInteger(totalUnits)) throw new CalculationError('Invoice amount is too large.');
  return {
    subtotal: subtotalUnits / factor,
    discountAmount: discountUnits / factor,
    taxAmount: taxUnits / factor,
    total: totalUnits / factor,
    balanceDue: paymentBalance(totalUnits / factor, amountPaid, currency),
  };
}

/** Detail/payment-only edits must not reprice an invoice issued under earlier rounding rules. */
export function calculateInvoiceForEdit(
  items: readonly { quantity: number; rate: number }[],
  taxRate: number,
  pricing: InvoicePricing = {},
  original?: InvoiceSnapshot,
): CalculatedInvoice {
  const calculated = calculateInvoice(items, taxRate, { ...pricing, amountPaid: 0 });
  const currency = pricing.currency ?? 'USD';
  if (original && !invoicePricingChanged(items, taxRate, pricing, original)) {
    return {
      subtotal: original.subtotal,
      discountAmount:
        pricing.discountType === 'fixed'
          ? money(pricing.discountValue ?? 0, currency)
          : money((original.subtotal * (pricing.discountValue ?? 0)) / 100, currency),
      taxAmount: original.taxAmount,
      total: original.total,
      balanceDue: paymentBalance(original.total, pricing.amountPaid ?? 0, currency),
    };
  }
  return {
    ...calculated,
    balanceDue: paymentBalance(calculated.total, pricing.amountPaid ?? 0, currency),
  };
}
