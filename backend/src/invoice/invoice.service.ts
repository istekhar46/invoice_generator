import { randomUUID } from 'node:crypto';
import { lockInvoiceRow } from './invoice-lock';
import { createOpeningPayment, paymentBalance } from '../payments/payment-ledger';
import { paidCache, paidStatus, savedMinor } from '../payments/payment-money';
import { lockCatalogItems, validateCatalogReferences } from '../catalog/catalog-references';
import { aggregateStockQuantities } from '../inventory/stock-quantity';
import {
  editInvoiceStock,
  invoiceStockReturns,
  issueInvoiceStock,
  trackedProductIds,
  voidInvoiceStock,
} from '../inventory/invoice-stock';
import {
  calculateInvoiceForEdit,
  invoicePricingChanged,
  money,
  type InvoicePricing,
  type InvoiceSnapshot,
} from './invoice-calculation';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Invoice, LineItem, InvoiceStatus, Prisma } from '@prisma/client';
import { invoicePaymentUrl, requireResolvedLiveLink } from '../razorpay/gateway-policy';
import { BaseUserService } from '../common/services/base-user-service';
import {
  CreateInvoiceDto,
  CreateQuickInvoiceDto,
  UpdateInvoiceDto,
  UpdateInvoiceStatusDto,
  InvoiceQueryDto,
  PaginatedResponseDto,
  CreateLineItemDto,
} from './dto';

export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface InvoiceWithRelations extends Invoice {
  hasPaymentHistory?: boolean;
  paymentUrl?: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  lineItems: LineItem[];
}

@Injectable()
export class InvoiceService extends BaseUserService {
  async create(userId: string, createInvoiceDto: CreateInvoiceDto): Promise<InvoiceWithRelations> {
    if ('amountPaid' in createInvoiceDto)
      throw new BadRequestException('Record payments after issuing the invoice.');
    // Validate user exists
    await this.validateUserExists(userId);

    // Verify customer exists and belongs to user
    await this.validateCustomerOwnership(createInvoiceDto.customerId, userId);

    // Validate dates
    this.validateInvoiceDates(createInvoiceDto.serviceDate, createInvoiceDto.dueDate);

    // Calculate totals
    const totals = this.calculateTotals(
      createInvoiceDto.lineItems,
      createInvoiceDto.taxRate,
      createInvoiceDto,
    );

    // Generate unique invoice number
    const requestedNumber = createInvoiceDto.invoiceNumber?.trim();
    const invoiceNumber = requestedNumber?.length ? requestedNumber : this.generateInvoiceNumber();
    await this.ensureInvoiceNumberAvailable(userId, invoiceNumber);

    // Create invoice with line items in a transaction
    const invoice = await this.prisma
      .$transaction(async (tx) => {
        const products = await validateCatalogReferences(tx, userId, createInvoiceDto.lineItems);
        aggregateStockQuantities(createInvoiceDto.lineItems, trackedProductIds(products));
        // Create the invoice
        const newInvoice = await tx.invoice.create({
          data: {
            ...this.optionData(createInvoiceDto),
            userId,
            customerId: createInvoiceDto.customerId,
            invoiceNumber,
            serviceDate: createInvoiceDto.serviceDate,
            dueDate: createInvoiceDto.dueDate,
            subtotal: totals.subtotal,
            taxRate: createInvoiceDto.taxRate,
            taxAmount: totals.taxAmount,
            total: totals.total,
            notes: createInvoiceDto.notes ?? null,
            status: InvoiceStatus.DRAFT,
          },
        });

        // Create line items
        const lineItemsData = createInvoiceDto.lineItems.map((item) => ({
          invoiceId: newInvoice.id,
          type: item.type,
          catalogItemId: item.catalogItemId ?? null,
          description: item.description,
          unit: item.unit.trim(),
          quantity: item.quantity,
          rate: item.rate,
          amount: money(item.quantity * item.rate, createInvoiceDto.currency),
        }));

        await tx.lineItem.createMany({
          data: lineItemsData,
        });

        return newInvoice;
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException(
            'An invoice with this number already exists in your account.',
          );
        }
        throw error;
      });

    // Return invoice with relations
    return await this.findById(userId, invoice.id);
  }

  async createQuick(
    userId: string,
    createQuickInvoiceDto: CreateQuickInvoiceDto,
  ): Promise<InvoiceWithRelations> {
    if ((createQuickInvoiceDto.amountPaid ?? 0) > 0 && !createQuickInvoiceDto.importedGuestDraft)
      throw new BadRequestException(
        'Record payments after issuing the invoice. Only a guest import may provide an opening paid balance.',
      );
    if (createQuickInvoiceDto.importedGuestDraft && !createQuickInvoiceDto.clientRequestId?.trim())
      throw new BadRequestException('A guest import requires its draft request ID.');
    // Validate user exists
    await this.validateUserExists(userId);

    const clientRequestId = createQuickInvoiceDto.clientRequestId;
    if (clientRequestId) {
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: { userId, clientRequestId },
        select: { id: true },
      });

      if (existingInvoice) {
        return this.findById(userId, existingInvoice.id);
      }
    }

    // If customerId is provided, verify customer exists and belongs to user
    if (createQuickInvoiceDto.customerId) {
      await this.validateCustomerOwnership(createQuickInvoiceDto.customerId, userId);
    }

    // Validate dates
    this.validateInvoiceDates(createQuickInvoiceDto.serviceDate, createQuickInvoiceDto.dueDate);

    // Calculate totals
    const totals = this.calculateTotals(
      createQuickInvoiceDto.lineItems,
      createQuickInvoiceDto.taxRate,
      createQuickInvoiceDto,
    );

    // Generate unique invoice number
    const requestedNumber = createQuickInvoiceDto.invoiceNumber?.trim();
    const invoiceNumber = requestedNumber?.length ? requestedNumber : this.generateInvoiceNumber();
    if (!createQuickInvoiceDto.customerId && !createQuickInvoiceDto.quickCustomerName?.trim()) {
      throw new BadRequestException('Customer name is required.');
    }

    // Create invoice with line items in a transaction
    let invoice: Invoice;
    try {
      invoice = await this.prisma.$transaction(async (tx) => {
        const products = await validateCatalogReferences(
          tx,
          userId,
          createQuickInvoiceDto.lineItems,
        );
        aggregateStockQuantities(createQuickInvoiceDto.lineItems, trackedProductIds(products));
        // Create the invoice with inline details
        const newInvoice = await tx.invoice.create({
          data: {
            ...this.optionData(createQuickInvoiceDto),
            userId,
            customerId: createQuickInvoiceDto.customerId ?? null,
            clientRequestId: clientRequestId ?? null,
            invoiceNumber,
            serviceDate: createQuickInvoiceDto.serviceDate,
            dueDate: createQuickInvoiceDto.dueDate,
            subtotal: totals.subtotal,
            taxRate: createQuickInvoiceDto.taxRate,
            taxAmount: totals.taxAmount,
            total: totals.total,
            notes: createQuickInvoiceDto.notes ?? null,
            status: InvoiceStatus.DRAFT,
            isQuickInvoice: true,
            // Inline company details
            quickCompanyName: createQuickInvoiceDto.quickCompanyName ?? null,
            quickCompanyAddress: createQuickInvoiceDto.quickCompanyAddress ?? null,
            quickCompanyCity: createQuickInvoiceDto.quickCompanyCity ?? null,
            quickCompanyState: createQuickInvoiceDto.quickCompanyState ?? null,
            quickCompanyZipCode: createQuickInvoiceDto.quickCompanyZipCode ?? null,
            quickCompanyPhone: createQuickInvoiceDto.quickCompanyPhone ?? null,
            quickCompanyEmail: createQuickInvoiceDto.quickCompanyEmail ?? null,
            quickCompanyTaxNumber: createQuickInvoiceDto.quickCompanyTaxNumber ?? null,
            // Inline customer details
            quickCustomerName: createQuickInvoiceDto.quickCustomerName ?? null,
            quickCustomerEmail: createQuickInvoiceDto.quickCustomerEmail ?? null,
            quickCustomerPhone: createQuickInvoiceDto.quickCustomerPhone ?? null,
            quickCustomerAddress: createQuickInvoiceDto.quickCustomerAddress ?? null,
            quickCustomerCity: createQuickInvoiceDto.quickCustomerCity ?? null,
            quickCustomerState: createQuickInvoiceDto.quickCustomerState ?? null,
            quickCustomerZipCode: createQuickInvoiceDto.quickCustomerZipCode ?? null,
          },
        });

        // Create line items
        const lineItemsData = createQuickInvoiceDto.lineItems.map((item) => ({
          invoiceId: newInvoice.id,
          type: item.type,
          catalogItemId: item.catalogItemId ?? null,
          description: item.description,
          unit: item.unit.trim(),
          quantity: item.quantity,
          rate: item.rate,
          amount: money(item.quantity * item.rate, createQuickInvoiceDto.currency),
        }));

        await tx.lineItem.createMany({
          data: lineItemsData,
        });

        await createOpeningPayment(tx, newInvoice);

        return newInvoice;
      });
    } catch (error) {
      if (
        clientRequestId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingInvoice = await this.prisma.invoice.findFirst({
          where: { userId, clientRequestId },
          select: { id: true },
        });

        if (existingInvoice) {
          return this.findById(userId, existingInvoice.id);
        }
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An invoice with this number already exists in your account.');
      }
      throw error;
    }

    // Return invoice with relations
    return await this.findById(userId, invoice.id);
  }

  async findAll(
    userId: string,
    query: InvoiceQueryDto,
  ): Promise<PaginatedResponseDto<InvoiceWithRelations>> {
    const {
      status,
      customerId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = query;

    // Build where clause with mandatory user isolation
    const where: Prisma.InvoiceWhereInput = { userId };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      // Validate customer ownership before filtering
      await this.validateCustomerOwnership(customerId, userId);
      where.customerId = customerId;
    }

    if (dateFrom || dateTo) {
      where.serviceDate = {};
      if (dateFrom) {
        where.serviceDate.gte = dateFrom;
      }
      if (dateTo) {
        where.serviceDate.lte = dateTo;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await this.prisma.invoice.count({ where });

    // Get invoices with pagination, sorting, and relations
    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        lineItems: true,
        _count: {
          select: { paymentEntries: true, gatewayPayments: { where: { link: { mode: 'LIVE' } } } },
        },
        gatewayLinks: {
          where: { mode: 'LIVE', state: 'ACTIVE', connection: { enabled: true } },
          select: { url: true, amountMinor: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: invoices.map((invoice) => {
        const { gatewayLinks, ...details } = invoice;
        return {
          ...details,
          hasPaymentHistory:
            invoice._count.paymentEntries > 0 || invoice._count.gatewayPayments > 0,
          paymentUrl: invoicePaymentUrl({ ...details, gatewayLinks }),
        };
      }),
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findById(userId: string, id: string): Promise<InvoiceWithRelations> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { userId, id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        lineItems: true,
        _count: {
          select: { paymentEntries: true, gatewayPayments: { where: { link: { mode: 'LIVE' } } } },
        },
        gatewayLinks: {
          where: { mode: 'LIVE', state: 'ACTIVE', connection: { enabled: true } },
          select: { url: true, amountMinor: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found or access denied');
    }

    const { gatewayLinks, ...details } = invoice;
    return {
      ...details,
      hasPaymentHistory: invoice._count.paymentEntries > 0 || invoice._count.gatewayPayments > 0,
      paymentUrl: invoicePaymentUrl({ ...details, gatewayLinks }),
    };
  }

  async update(userId: string, id: string, dto: UpdateInvoiceDto): Promise<InvoiceWithRelations> {
    if ('amountPaid' in dto || 'importedGuestDraft' in dto)
      throw new BadRequestException(
        'Paid amounts come from payment history. Record or reverse a payment instead.',
      );
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const existing = await this.lockInvoice(tx, userId, id);
          if (existing.status === InvoiceStatus.VOIDED)
            throw new ConflictException(
              'Voided invoices cannot be edited. Create a new invoice instead.',
            );
          if (
            dto.customerId &&
            !(await tx.customer.findFirst({
              where: { id: dto.customerId, userId },
              select: { id: true },
            }))
          )
            throw new NotFoundException('Customer not found or access denied');
          const serviceDate = dto.serviceDate ?? existing.serviceDate;
          const dueDate = dto.dueDate ?? existing.dueDate;
          this.validateInvoiceDates(serviceDate, dueDate);
          const requestedNumber = dto.invoiceNumber?.trim();
          const invoiceNumber = requestedNumber?.length ? requestedNumber : existing.invoiceNumber;
          await this.ensureInvoiceNumberAvailable(userId, invoiceNumber, id, tx);
          const options = this.optionData(dto, dto.currency ?? existing.currency);
          if (
            dto.currency &&
            dto.currency !== existing.currency &&
            ((await tx.paymentEntry.count({ where: { userId, invoiceId: id } })) ||
              (await tx.gatewayPayment.count({
                where: { userId, invoiceId: id, link: { mode: 'LIVE' } },
              })))
          )
            throw new ConflictException(
              'Currency is fixed once an invoice has payment history, including reversed entries.',
            );
          const paid = await paymentBalance(tx, id, userId);
          const pricing = {
            ...existing,
            ...options,
            amountPaid: paidCache(paid, dto.currency ?? existing.currency),
          };
          const lineItems = dto.lineItems ?? existing.lineItems;
          const taxRate = dto.taxRate ?? existing.taxRate;
          const totals = this.calculateTotals(
            lineItems,
            taxRate,
            { ...pricing, amountPaid: 0 },
            existing,
          );
          const paymentStatus = paidStatus(
            existing.status,
            savedMinor(totals.total, pricing.currency),
            paid,
          );
          const pricingChanged = invoicePricingChanged(lineItems, taxRate, pricing, existing);
          if (pricingChanged) await requireResolvedLiveLink(tx, userId, id);
          const inlineFields = [
            'quickCompanyName',
            'quickCompanyAddress',
            'quickCompanyCity',
            'quickCompanyState',
            'quickCompanyZipCode',
            'quickCompanyPhone',
            'quickCompanyEmail',
            'quickCompanyTaxNumber',
            'quickCustomerName',
            'quickCustomerEmail',
            'quickCustomerPhone',
            'quickCustomerAddress',
            'quickCustomerCity',
            'quickCustomerState',
            'quickCustomerZipCode',
          ] as const;
          if (
            existing.isQuickInvoice &&
            !(dto.customerId ?? existing.customerId) &&
            !(dto.quickCustomerName ?? existing.quickCustomerName)?.trim()
          ) {
            throw new BadRequestException('Customer name is required.');
          }
          const inline = Object.fromEntries(
            inlineFields
              .filter((field) => existing.isQuickInvoice && dto[field] !== undefined)
              .map((field) => [field, dto[field]]),
          );
          const products = await validateCatalogReferences(
            tx,
            userId,
            lineItems,
            existing.lineItems,
          );
          if (existing.status === InvoiceStatus.DRAFT)
            aggregateStockQuantities(lineItems, trackedProductIds(products));
          else await editInvoiceStock(tx, userId, id, existing.lineItems, lineItems, products);
          await tx.invoice.update({
            where: { id },
            data: {
              ...options,
              ...inline,
              invoiceNumber,
              serviceDate,
              dueDate,
              taxRate,
              ...(dto.customerId !== undefined && { customerId: dto.customerId }),
              ...(dto.notes !== undefined && { notes: dto.notes }),
              subtotal: totals.subtotal,
              taxAmount: totals.taxAmount,
              total: totals.total,
              amountPaid: pricing.amountPaid,
              status: paymentStatus,
            },
          });
          if (dto.lineItems || pricingChanged) {
            await tx.lineItem.deleteMany({ where: { invoiceId: id } });
            await tx.lineItem.createMany({
              data: lineItems.map((item, index) => ({
                invoiceId: id,
                type: item.type,
                catalogItemId: item.catalogItemId ?? null,
                description: item.description,
                unit: item.unit.trim(),
                quantity: item.quantity,
                rate: item.rate,
                amount: pricingChanged
                  ? money(item.quantity * item.rate, pricing.currency)
                  : existing.lineItems[index].amount,
              })),
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An invoice with this number already exists in your account.');
      }
      throw error;
    }
    return this.findById(userId, id);
  }

  async updateStatus(
    userId: string,
    id: string,
    dto: UpdateInvoiceStatusDto,
  ): Promise<InvoiceWithRelations> {
    await this.prisma.$transaction(
      async (tx) => {
        const invoice = await this.lockInvoice(tx, userId, id);
        const next = dto.status;
        if (invoice.status === next) return;
        if (next === InvoiceStatus.PAID)
          throw new ConflictException(
            'Record a payment to mark the invoice Paid. Payment status is calculated from its history.',
          );
        if (invoice.status === InvoiceStatus.PAID && next === InvoiceStatus.SENT)
          throw new ConflictException('Reverse a recorded payment to reopen the balance.');
        if (invoice.status === InvoiceStatus.VOIDED)
          throw new ConflictException(
            'A voided invoice cannot be reopened. Create a new invoice instead.',
          );
        if (next === InvoiceStatus.DRAFT)
          throw new ConflictException(
            'Issued invoices cannot return to Draft. Void an unpaid invoice instead.',
          );
        const paid = await paymentBalance(tx, id, userId);
        if (next === InvoiceStatus.VOIDED) {
          await requireResolvedLiveLink(tx, userId, id);
          if (invoice.status !== InvoiceStatus.SENT || paid > 0n)
            throw new ConflictException(
              'Only an unpaid issued invoice can be voided. Reverse any recorded payment first.',
            );
          const returns = await invoiceStockReturns(tx, userId, id);
          await lockCatalogItems(tx, userId, [
            ...invoice.lineItems.flatMap((item) =>
              item.catalogItemId ? [item.catalogItemId] : [],
            ),
            ...returns.map((item) => item.catalogItemId),
          ]);
          await voidInvoiceStock(tx, userId, id, returns);
          await tx.invoice.update({ where: { id }, data: { status: next } });
          return;
        }
        let issuedAt: Date | undefined;
        if (invoice.status === InvoiceStatus.DRAFT) {
          const products = await validateCatalogReferences(
            tx,
            userId,
            invoice.lineItems,
            invoice.lineItems,
          );
          issuedAt = await issueInvoiceStock(tx, userId, invoice, products);
        }
        await tx.invoice.update({
          where: { id },
          data: {
            status: paidStatus(next, savedMinor(invoice.total, invoice.currency), paid),
            ...(issuedAt && { issuedAt }),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.findById(userId, id);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const invoice = await this.lockInvoice(tx, userId, id);
        if (
          invoice.status !== InvoiceStatus.DRAFT ||
          invoice.amountPaid > 0 ||
          (await tx.paymentEntry.count({ where: { userId, invoiceId: id } })) ||
          (await tx.stockAction.count({ where: { userId, invoiceId: id } }))
        ) {
          throw new ConflictException(
            'Only unpaid drafts without stock or payment history can be deleted. Void an unpaid issued invoice to retain its history.',
          );
        }
        await tx.invoice.delete({ where: { id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  private async lockInvoice(tx: Prisma.TransactionClient, userId: string, id: string) {
    await lockInvoiceRow(tx, userId, id);
    return tx.invoice.findUniqueOrThrow({ where: { id }, include: { lineItems: true } });
  }

  generateInvoiceNumber(): string {
    // UUID generation avoids races between simultaneous automatic invoice creation.
    return `INV-${randomUUID()}`;
  }

  private async ensureInvoiceNumberAvailable(
    userId: string,
    invoiceNumber: string,
    exceptId?: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const existing = await client.invoice.findFirst({
      where: { userId, invoiceNumber, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('An invoice with this number already exists in your account.');
  }

  private optionData(dto: Partial<CreateQuickInvoiceDto>, currency = dto.currency ?? 'USD') {
    if (dto.logoDataUrl) {
      const [prefix, encoded] = dto.logoDataUrl.split(',');
      const image = Buffer.from(encoded || '', 'base64');
      const png =
        prefix === 'data:image/png;base64' &&
        image.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
      const jpeg = prefix === 'data:image/jpeg;base64' && image[0] === 0xff && image[1] === 0xd8;
      if ((!png && !jpeg) || image.length > 256 * 1024)
        throw new BadRequestException('Use a PNG or JPEG logo smaller than 256 KB.');
    }
    const fields = [
      'currency',
      'discountType',
      'discountValue',
      'shippingAmount',
      'amountPaid',
      'paymentTerms',
      'terms',
      'purchaseOrderNumber',
      'shippingAddress',
      'logoDataUrl',
    ] as const;
    return Object.fromEntries(
      fields
        .filter((field) => dto[field] !== undefined)
        .map((field) => [
          field,
          (field === 'shippingAmount' ||
            field === 'amountPaid' ||
            (field === 'discountValue' && dto.discountType === 'fixed')) &&
          typeof dto[field] === 'number'
            ? money(dto[field], currency)
            : dto[field],
        ]),
    ) as Pick<CreateQuickInvoiceDto, (typeof fields)[number]>;
  }

  calculateTotals(
    lineItems: CreateLineItemDto[],
    taxRate: number,
    pricing: InvoicePricing = {},
    original?: InvoiceSnapshot,
  ): InvoiceTotals {
    try {
      return calculateInvoiceForEdit(lineItems, taxRate, pricing, original);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid invoice totals.',
      );
    }
  }

  private validateInvoiceDates(serviceDate: Date, dueDate: Date): void {
    // Ensure due date is not before service date
    if (dueDate < serviceDate) {
      throw new BadRequestException({
        message: 'Due date cannot be before service date',
        details: {
          serviceDate: serviceDate.toISOString(),
          dueDate: dueDate.toISOString(),
        },
      });
    }

    // Ensure service date is not too far in the future (optional business rule)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (serviceDate > oneYearFromNow) {
      throw new BadRequestException({
        message: 'Service date cannot be more than one year in the future',
        details: {
          serviceDate: serviceDate.toISOString(),
          maxAllowedDate: oneYearFromNow.toISOString(),
        },
      });
    }
  }
}
