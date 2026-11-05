import { ConflictException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { BaseUserService } from '../common/services/base-user-service';
import { DirectUpiDetailsDto } from './direct-upi.dto';
import { lockInvoiceRow } from '../invoice/invoice-lock';
import { requireResolvedLiveLink } from '../razorpay/gateway-policy';
import { paymentBalance } from './payment-ledger';
import { savedMinor } from './payment-money';
import { invoiceUpiDetails } from './direct-upi-policy';

const details = { upiId: true, payeeName: true } as const;

@Injectable()
export class DirectUpiService extends BaseUserService {
  preferences(userId: string) {
    return this.prisma.upiPaymentPreference.findUnique({ where: { userId }, select: details });
  }

  async savePreferences(userId: string, data: DirectUpiDetailsDto) {
    await this.validateUserExists(userId);
    const { upiId, payeeName } = data;
    return this.prisma.upiPaymentPreference.upsert({
      where: { userId },
      create: { userId, upiId, payeeName },
      update: { upiId, payeeName },
      select: details,
    });
  }

  async removePreferences(userId: string) {
    await this.prisma.upiPaymentPreference.deleteMany({ where: { userId } });
    return { removed: true };
  }

  async enable(userId: string, invoiceId: string, expected: DirectUpiDetailsDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockInvoiceRow(tx, userId, invoiceId);
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      if (
        invoice.status !== 'SENT' ||
        invoice.currency !== 'INR' ||
        savedMinor(invoice.total, 'INR') <= (await paymentBalance(tx, invoiceId, userId))
      )
        throw new ConflictException(
          'Enable direct UPI on an issued INR invoice with an outstanding balance.',
        );
      await requireResolvedLiveLink(tx, userId, invoiceId);
      const existing = invoiceUpiDetails(invoice);
      if (existing) {
        if (existing.upiId !== expected.upiId || existing.payeeName !== expected.payeeName)
          throw new ConflictException(
            'Remove the existing direct UPI details before replacing them.',
          );
        return existing;
      }
      const preference = await tx.upiPaymentPreference.findUnique({
        where: { userId },
        select: details,
      });
      if (!preference)
        throw new ConflictException('Save your receiving UPI details in Payment settings first.');
      if (preference.upiId !== expected.upiId || preference.payeeName !== expected.payeeName)
        throw new ConflictException(
          'UPI settings changed. Refresh and review the receiving details before enabling the QR.',
        );
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          directUpiId: preference.upiId,
          directUpiPayeeName: preference.payeeName,
          directUpiReference: randomBytes(16).toString('hex'),
        },
      });
      return invoiceUpiDetails(updated);
    });
  }

  async remove(userId: string, invoiceId: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockInvoiceRow(tx, userId, invoiceId);
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { directUpiId: null, directUpiPayeeName: null, directUpiReference: null },
      });
    });
    return { removed: true };
  }
}
