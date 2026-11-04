import { InvoiceService } from './invoice.service';

describe('InvoiceService quick-invoice idempotency', () => {
  it('returns the existing invoice for the same user and client request ID', async () => {
    const existingInvoice = {
      id: 'invoice-1',
      userId: 'user-1',
      customer: null,
      lineItems: [],
      _count: { paymentEntries: 0, gatewayPayments: 0 },
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
      invoice: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'invoice-1' })
          .mockResolvedValueOnce({ ...existingInvoice, gatewayLinks: [] }),
      },
      $transaction: jest.fn(),
    };
    const service = new InvoiceService(prisma as never);

    const result = await service.createQuick('user-1', {
      isQuickInvoice: true,
      clientRequestId: 'guest-draft-1',
      quickCustomerName: 'Guest Customer',
      serviceDate: new Date('2026-10-01'),
      dueDate: new Date('2026-10-31'),
      taxRate: 0.1,
      lineItems: [
        {
          type: 'PRODUCT',
          description: 'Consulting',
          unit: 'hour',
          quantity: 1,
          rate: 100,
        },
      ],
    });

    expect(result).toEqual({ ...existingInvoice, hasPaymentHistory: false, paymentUrl: null });
    expect(prisma.invoice.findFirst).toHaveBeenNthCalledWith(1, {
      where: { userId: 'user-1', clientRequestId: 'guest-draft-1' },
      select: { id: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
