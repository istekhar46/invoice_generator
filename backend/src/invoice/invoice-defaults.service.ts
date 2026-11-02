import { Injectable } from '@nestjs/common';
import { BaseUserService } from '../common/services/base-user-service';
import { InvoiceDefaultsDto } from './dto/invoice-defaults.dto';

const preferenceFields = {
  currency: true,
  taxRate: true,
  paymentTerms: true,
  notes: true,
  terms: true,
} as const;

@Injectable()
export class InvoiceDefaultsService extends BaseUserService {
  async get(userId: string): Promise<InvoiceDefaultsDto | null> {
    return this.prisma.invoiceDefaults.findUnique({ where: { userId }, select: preferenceFields });
  }

  async save(userId: string, data: InvoiceDefaultsDto): Promise<InvoiceDefaultsDto> {
    await this.validateUserExists(userId);
    const { currency, taxRate, paymentTerms, notes, terms } = data;
    const settings = { currency, taxRate, paymentTerms, notes, terms };
    return this.prisma.invoiceDefaults.upsert({
      where: { userId },
      create: { userId, ...settings },
      update: settings,
      select: preferenceFields,
    });
  }
}
