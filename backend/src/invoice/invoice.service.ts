import { randomUUID } from 'node:crypto';
import { validateCatalogReferences } from '../catalog/catalog-references';
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
  Logger,
} from '@nestjs/common';
import { Invoice, LineItem, InvoiceStatus, Prisma } from '@prisma/client';
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
  private readonly logger = new Logger(InvoiceService.name);

  async create(userId: string, createInvoiceDto: CreateInvoiceDto): Promise<InvoiceWithRelations> {
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
        await validateCatalogReferences(tx, userId, createInvoiceDto.lineItems);
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
        await validateCatalogReferences(tx, userId, createQuickInvoiceDto.lineItems);
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
      data: invoices as InvoiceWithRelations[],
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
      where: this.buildUserIsolatedWhere(userId, { id }),
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
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found or access denied');
    }

    return invoice as InvoiceWithRelations;
  }

  async update(userId: string, id: string, dto: UpdateInvoiceDto): Promise<InvoiceWithRelations> {
    const existing = await this.findById(userId, id);
    if (dto.customerId) await this.validateCustomerOwnership(dto.customerId, userId);
    const serviceDate = dto.serviceDate ?? existing.serviceDate;
    const dueDate = dto.dueDate ?? existing.dueDate;
    this.validateInvoiceDates(serviceDate, dueDate);
    const requestedNumber = dto.invoiceNumber?.trim();
    const invoiceNumber = requestedNumber?.length ? requestedNumber : existing.invoiceNumber;
    await this.ensureInvoiceNumberAvailable(userId, invoiceNumber, id);
    const options = this.optionData(dto, dto.currency ?? existing.currency);
    const pricing = { ...existing, ...options };
    const lineItems = dto.lineItems ?? existing.lineItems;
    const taxRate = dto.taxRate ?? existing.taxRate;
    const totals = this.calculateTotals(lineItems, taxRate, pricing, existing);
    const pricingChanged = invoicePricingChanged(lineItems, taxRate, pricing, existing);
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
    try {
      await this.prisma.$transaction(async (tx) => {
        await validateCatalogReferences(tx, userId, lineItems, existing.lineItems);
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
            ...(existing.status === InvoiceStatus.PAID &&
              totals.total > money(pricing.amountPaid, pricing.currency) && {
                status: InvoiceStatus.SENT,
              }),
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
      });
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
    updateStatusDto: UpdateInvoiceStatusDto,
  ): Promise<InvoiceWithRelations> {
    // Keep recorded payment and the explicit Paid action consistent.
    const invoice = await this.findById(userId, id);

    // Update invoice status with additional safety check
    const updateResult = await this.prisma.invoice.updateMany({
      where: this.buildUserIsolatedWhere(userId, { id }),
      data: {
        status: updateStatusDto.status,
        ...(updateStatusDto.status === 'PAID' && { amountPaid: invoice.total }),
      },
    });

    if (updateResult.count === 0) {
      throw new NotFoundException('Invoice not found or access denied');
    }

    // Return updated invoice with relations
    return await this.findById(userId, id);
  }

  async delete(userId: string, id: string): Promise<void> {
    this.logger.log(`Delete invoice request - userId: ${userId}, invoiceId: ${id}`);

    // Validate invoice ownership before deletion
    await this.validateInvoiceOwnership(id, userId);

    // Get line item count before deletion for logging
    const lineItemCount = await this.prisma.lineItem.count({
      where: { invoiceId: id },
    });

    // Delete invoice with additional safety check (line items will be deleted automatically due to cascade)
    const deleteResult = await this.prisma.invoice.deleteMany({
      where: this.buildUserIsolatedWhere(userId, { id }),
    });

    if (deleteResult.count === 0) {
      this.logger.error(
        `Delete failed - invoice not found during deletion - userId: ${userId}, invoiceId: ${id}`,
      );
      throw new NotFoundException('Invoice not found or access denied');
    }

    // Verify cascade deletion occurred
    const remainingLineItems = await this.prisma.lineItem.count({
      where: { invoiceId: id },
    });

    if (remainingLineItems > 0) {
      this.logger.error(
        `Delete warning - cascade deletion may have failed - userId: ${userId}, invoiceId: ${id}, remainingLineItems: ${remainingLineItems}`,
      );
    }

    this.logger.log(
      `Invoice deleted successfully - userId: ${userId}, invoiceId: ${id}, deletedLineItems: ${lineItemCount}`,
    );
  }

  generateInvoiceNumber(): string {
    // UUID generation avoids races between simultaneous automatic invoice creation.
    return `INV-${randomUUID()}`;
  }

  private async ensureInvoiceNumberAvailable(
    userId: string,
    invoiceNumber: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.prisma.invoice.findFirst({
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
