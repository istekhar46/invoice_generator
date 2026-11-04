import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, QuoteStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { allocateDocumentNumber, recordDocumentNumber } from '../invoice/document-number';
import { calculateInvoiceForEdit, money } from '../invoice/invoice-calculation';
import { validateInvoiceLogo } from '../invoice/invoice-logo';
import { validateCatalogReferences } from '../catalog/catalog-references';
import { aggregateStockQuantities } from '../inventory/stock-quantity';
import { trackedProductIds } from '../inventory/invoice-stock';
import {
  ConvertQuoteDto,
  CreateQuoteDto,
  QuoteContentDto,
  QuoteQueryDto,
  QuoteStatusDto,
  UpdateQuoteDto,
} from './quote.dto';

const include = {
  lineItems: { orderBy: { position: 'asc' } },
  convertedInvoice: { select: { id: true, invoiceNumber: true, status: true } },
} satisfies Prisma.QuoteInclude;
type Quote = Prisma.QuoteGetPayload<{ include: typeof include }>;
export interface PartySnapshot extends Prisma.JsonObject {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  taxNumber?: string;
}
export const todayUTC = () => new Date().toISOString().slice(0, 10);
export const quoteExpired = (validUntil: Date, today = todayUTC()) =>
  validUntil.toISOString().slice(0, 10) < today;
function serialize(quote: Quote) {
  return {
    ...quote,
    requestHash: undefined,
    clientRequestId: undefined,
    quoteDate: quote.quoteDate.toISOString().slice(0, 10),
    validUntil: quote.validUntil.toISOString().slice(0, 10),
    isExpired: quoteExpired(quote.validUntil),
    expiryTimezone: 'UTC',
  };
}
const transitions: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ['ISSUED', 'CANCELLED'],
  ISSUED: ['ACCEPTED', 'DECLINED', 'CANCELLED'],
  ACCEPTED: ['CANCELLED'],
  DECLINED: [],
  CANCELLED: [],
};
@Injectable()
export class QuoteService {
  constructor(private readonly prisma: PrismaService) {}

  private content(dto: QuoteContentDto) {
    if (dto.validUntil < dto.quoteDate)
      throw new BadRequestException('Validity date cannot be before the quotation date.');
    if (dto.lineItems.some((item) => !item.description.trim() || !item.unit.trim()))
      throw new BadRequestException('Description and unit are required for every line.');
    validateInvoiceLogo(dto.logoDataUrl);
    const options = {
      currency: dto.currency ?? 'USD',
      discountType: dto.discountType ?? 'percentage',
      discountValue: dto.discountValue ?? 0,
      shippingAmount: dto.shippingAmount ?? 0,
    };
    try {
      const totals = calculateInvoiceForEdit(dto.lineItems, dto.taxRate, options);
      return {
        ...options,
        discountValue:
          options.discountType === 'fixed'
            ? money(options.discountValue, options.currency)
            : options.discountValue,
        shippingAmount: money(options.shippingAmount, options.currency),
        quoteDate: new Date(`${dto.quoteDate}T00:00:00Z`),
        validUntil: new Date(`${dto.validUntil}T00:00:00Z`),
        subtotal: totals.subtotal,
        taxRate: dto.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
        paymentTerms: dto.paymentTerms ?? '',
        notes: dto.notes ?? '',
        terms: dto.terms ?? '',
        purchaseOrderNumber: dto.purchaseOrderNumber ?? '',
        shippingAddress: dto.shippingAddress ?? '',
        logoDataUrl: dto.logoDataUrl ?? '',
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid quotation totals.',
      );
    }
  }
  private async parties(tx: Prisma.TransactionClient, userId: string, customerId: string) {
    // Serialize customer deletion against snapshot/reference creation.
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM customers WHERE "id"=${customerId} AND "userId"=${userId} FOR KEY SHARE`;
    if (!rows.length) throw new NotFoundException('Customer not found or access denied.');
    const [customer, company] = await Promise.all([
      tx.customer.findUniqueOrThrow({ where: { id: customerId } }),
      tx.companyProfile.findUnique({ where: { userId } }),
    ]);
    if (!company)
      throw new BadRequestException('Set up your company profile before creating quotations.');
    const fields = (party: typeof customer) => ({
      name: party.name,
      address: party.address,
      city: party.city,
      state: party.state,
      zipCode: party.zipCode,
      phone: party.phone,
      email: party.email,
    });
    return {
      customerId,
      customerSnapshot: fields(customer),
      companySnapshot: {
        name: company.businessName,
        address: company.address,
        city: company.city,
        state: company.state,
        zipCode: company.zipCode,
        phone: company.phone,
        email: company.email,
        taxNumber: company.taxNumber,
      },
    };
  }
  private async lock(tx: Prisma.TransactionClient, userId: string, id: string) {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM quotes WHERE id=${id} AND "userId"=${userId} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Quotation not found or access denied.');
    return tx.quote.findUniqueOrThrow({ where: { id }, include });
  }
  private version(quote: Quote, version: number) {
    if (quote.version !== version)
      throw new ConflictException(
        'This quotation changed. Reload it before saving or changing its status.',
      );
  }
  private lines(dto: QuoteContentDto) {
    return dto.lineItems.map((item, position) => ({
      position,
      type: item.type,
      catalogItemId: item.catalogItemId ?? null,
      description: item.description.trim(),
      unit: item.unit.trim(),
      quantity: item.quantity,
      rate: item.rate,
      amount: money(item.quantity * item.rate, dto.currency ?? 'USD'),
    }));
  }
  async create(userId: string, dto: CreateQuoteDto) {
    const content = this.content(dto);
    const hash = createHash('sha256')
      .update(JSON.stringify({ content, customerId: dto.customerId, lines: this.lines(dto) }))
      .digest('hex');
    const where = { userId_clientRequestId: { userId, clientRequestId: dto.clientRequestId } };
    const replay = (quote: Quote) => {
      if (quote.requestHash !== hash)
        throw new ConflictException(
          'This request already created a different quotation. Open your quotation list before creating another.',
        );
      return serialize(quote);
    };
    const existing = await this.prisma.quote.findUnique({ where, include });
    if (existing) return replay(existing);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const quoteNumber = await allocateDocumentNumber(tx, userId, 'QUOTE');
        const parties = await this.parties(tx, userId, dto.customerId);
        const products = await validateCatalogReferences(tx, userId, dto.lineItems);
        aggregateStockQuantities(dto.lineItems, trackedProductIds(products));
        const created = await tx.quote.create({
          data: {
            userId,
            clientRequestId: dto.clientRequestId,
            requestHash: hash,
            quoteNumber,
            ...content,
            ...parties,
            lineItems: { create: this.lines(dto) },
          },
          include,
        });
        await recordDocumentNumber(tx, userId, 'QUOTE', quoteNumber, created.id);
        return serialize(created);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const prior = await this.prisma.quote.findUnique({ where, include });
        if (prior) return replay(prior);
      }
      throw error;
    }
  }
  async update(userId: string, id: string, dto: UpdateQuoteDto) {
    const content = this.content(dto);
    return this.prisma.$transaction(async (tx) => {
      const quote = await this.lock(tx, userId, id);
      this.version(quote, dto.version);
      if (quote.status !== 'DRAFT')
        throw new ConflictException(
          'Issued quotation content is fixed. Cancel it and create a new quotation for revisions.',
        );
      const customer = await tx.customer.findFirst({ where: { id: dto.customerId, userId } });
      if (!customer) throw new NotFoundException('Customer not found or access denied.');
      const parties = {
        customerId: dto.customerId,
        companySnapshot: quote.companySnapshot as Prisma.InputJsonObject,
        customerSnapshot:
          quote.customerId === dto.customerId
            ? (quote.customerSnapshot as Prisma.InputJsonObject)
            : {
                name: customer.name,
                address: customer.address,
                city: customer.city,
                state: customer.state,
                zipCode: customer.zipCode,
                phone: customer.phone,
                email: customer.email,
              },
      };

      const products = await validateCatalogReferences(tx, userId, dto.lineItems, quote.lineItems);
      aggregateStockQuantities(dto.lineItems, trackedProductIds(products));
      await tx.quoteLineItem.deleteMany({ where: { userId, quoteId: id } });
      return serialize(
        await tx.quote.update({
          where: { id },
          data: {
            ...content,
            ...parties,
            version: { increment: 1 },
            lineItems: { create: this.lines(dto) },
          },
          include,
        }),
      );
    });
  }
  async findById(userId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({ where: { id, userId }, include });
    if (!quote) throw new NotFoundException('Quotation not found or access denied.');
    return serialize(quote);
  }
  async list(userId: string, query: QuoteQueryDto) {
    const { page, limit, status, search, expiry } = query;
    const where: Prisma.QuoteWhereInput = {
      userId,
      ...(status && { status }),
      ...(expiry && {
        validUntil: { lt: new Date(`${todayUTC()}T00:00:00Z`) },
        status: status ?? { in: ['DRAFT', 'ISSUED', 'ACCEPTED'] },
        convertedInvoice: null,
      }),
      ...(search?.trim() && {
        OR: [
          { quoteNumber: { contains: search.trim(), mode: 'insensitive' } },
          {
            customerSnapshot: {
              path: ['name'],
              string_contains: search.trim(),
              mode: 'insensitive',
            },
          },
        ],
      }),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.quote.count({ where });
        const data = await tx.quote.findMany({
          where,
          include,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        });
        return {
          data: data.map(serialize),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async status(userId: string, id: string, dto: QuoteStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const quote = await this.lock(tx, userId, id);
      if (quote.status === dto.status) return serialize(quote);
      this.version(quote, dto.version);
      if (quote.convertedInvoice)
        throw new ConflictException(
          'A converted quotation is retained unchanged. Manage its linked invoice.',
        );
      if (!transitions[quote.status].includes(dto.status))
        throw new ConflictException('This quotation status change is not allowed.');
      if (['ISSUED', 'ACCEPTED'].includes(dto.status) && quoteExpired(quote.validUntil))
        throw new ConflictException(
          'This quotation has expired. Cancel it and create a new quotation.',
        );
      return serialize(
        await tx.quote.update({
          where: { id },
          data: {
            status: dto.status,
            version: { increment: 1 },
            ...(dto.status === 'ISSUED' && { issuedAt: new Date() }),
            ...(dto.status === 'ACCEPTED' && { acceptedAt: new Date() }),
          },
          include,
        }),
      );
    });
  }
  async convert(userId: string, id: string, dto: ConvertQuoteDto) {
    return this.prisma.$transaction(async (tx) => {
      const quote = await this.lock(tx, userId, id);
      if (quote.convertedInvoice) return { invoice: quote.convertedInvoice, replayed: true };
      this.version(quote, dto.version);
      if (quote.status !== 'ACCEPTED' || quoteExpired(quote.validUntil))
        throw new ConflictException('Only an accepted, unexpired quotation can be converted.');
      if (dto.dueDate < dto.serviceDate)
        throw new BadRequestException('Due date cannot be before invoice date.');
      const maxDate = new Date();
      maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 1);
      if (new Date(dto.serviceDate) > maxDate)
        throw new BadRequestException('Invoice date cannot be more than one year in the future.');
      const invoiceNumber = await allocateDocumentNumber(tx, userId, 'INVOICE', dto.invoiceNumber);
      // References were selected on the saved quote; archived retained rows remain linked.
      const products = await validateCatalogReferences(
        tx,
        userId,
        quote.lineItems,
        quote.lineItems,
      );
      aggregateStockQuantities(quote.lineItems, trackedProductIds(products));
      const company = quote.companySnapshot as PartySnapshot,
        customer = quote.customerSnapshot as PartySnapshot;
      const invoice = await tx.invoice.create({
        data: {
          userId,
          sourceQuoteId: id,
          customerId: quote.customerId,
          invoiceNumber,
          status: 'DRAFT',
          isQuickInvoice: true,
          serviceDate: new Date(`${dto.serviceDate}T00:00:00Z`),
          dueDate: new Date(`${dto.dueDate}T00:00:00Z`),
          currency: quote.currency,
          discountType: quote.discountType,
          discountValue: quote.discountValue,
          shippingAmount: quote.shippingAmount,
          subtotal: quote.subtotal,
          taxRate: quote.taxRate,
          taxAmount: quote.taxAmount,
          total: quote.total,
          amountPaid: 0,
          notes: quote.notes,
          terms: quote.terms,
          paymentTerms: quote.paymentTerms,
          purchaseOrderNumber: quote.purchaseOrderNumber,
          shippingAddress: quote.shippingAddress,
          logoDataUrl: quote.logoDataUrl,
          quickCompanyName: company.name,
          quickCompanyAddress: company.address,
          quickCompanyCity: company.city,
          quickCompanyState: company.state,
          quickCompanyZipCode: company.zipCode,
          quickCompanyPhone: company.phone,
          quickCompanyEmail: company.email,
          quickCompanyTaxNumber: company.taxNumber ?? null,
          quickCustomerName: customer.name,
          quickCustomerAddress: customer.address,
          quickCustomerCity: customer.city,
          quickCustomerState: customer.state,
          quickCustomerZipCode: customer.zipCode,
          quickCustomerPhone: customer.phone,
          quickCustomerEmail: customer.email,
          lineItems: {
            create: quote.lineItems.map((item) => ({
              type: item.type,
              catalogItemId: item.catalogItemId,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount,
            })),
          },
        },
        select: { id: true, invoiceNumber: true, status: true },
      });
      await recordDocumentNumber(tx, userId, 'INVOICE', invoiceNumber, invoice.id);
      return { invoice, replayed: false };
    });
  }
}
