import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Invoice, LineItem, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
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
  };
  lineItems: LineItem[];
}

@Injectable()
export class InvoiceService extends BaseUserService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    userId: string,
    createInvoiceDto: CreateInvoiceDto,
  ): Promise<InvoiceWithRelations> {
    // Validate user exists
    await this.validateUserExists(userId);

    // Verify customer exists and belongs to user
    await this.validateCustomerOwnership(createInvoiceDto.customerId, userId);

    // Validate dates
    this.validateInvoiceDates(createInvoiceDto.serviceDate, createInvoiceDto.dueDate);

    // Calculate totals
    const totals = this.calculateTotals(createInvoiceDto.lineItems, createInvoiceDto.taxRate);

    // Generate unique invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    try {
      // Create invoice with line items in a transaction
      const invoice = await this.prisma.$transaction(async (tx) => {
        // Create the invoice
        const newInvoice = await tx.invoice.create({
          data: {
            userId,
            customerId: createInvoiceDto.customerId,
            invoiceNumber,
            serviceDate: createInvoiceDto.serviceDate,
            dueDate: createInvoiceDto.dueDate,
            subtotal: totals.subtotal,
            taxRate: createInvoiceDto.taxRate,
            taxAmount: totals.taxAmount,
            total: totals.total,
            notes: createInvoiceDto.notes || null,
            status: InvoiceStatus.DRAFT,
          },
        });

        // Create line items
        const lineItemsData = createInvoiceDto.lineItems.map((item) => ({
          invoiceId: newInvoice.id,
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
        }));

        await tx.lineItem.createMany({
          data: lineItemsData,
        });

        return newInvoice;
      });

      // Return invoice with relations
      return await this.findById(userId, invoice.id);
    } catch (error) {
      // Let the global exception filter handle Prisma errors
      throw error;
    }
  }

  async createQuick(
    userId: string,
    createQuickInvoiceDto: CreateQuickInvoiceDto,
  ): Promise<InvoiceWithRelations> {
    // Validate user exists
    await this.validateUserExists(userId);

    // If customerId is provided, verify customer exists and belongs to user
    if (createQuickInvoiceDto.customerId) {
      await this.validateCustomerOwnership(createQuickInvoiceDto.customerId, userId);
    }

    // Validate dates
    this.validateInvoiceDates(createQuickInvoiceDto.serviceDate, createQuickInvoiceDto.dueDate);

    // Calculate totals
    const totals = this.calculateTotals(createQuickInvoiceDto.lineItems, createQuickInvoiceDto.taxRate);

    // Generate unique invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    try {
      // Create invoice with line items in a transaction
      const invoice = await this.prisma.$transaction(async (tx) => {
        // Create the invoice with inline details
        const newInvoice = await tx.invoice.create({
          data: {
            userId,
            customerId: createQuickInvoiceDto.customerId || null,
            invoiceNumber,
            serviceDate: createQuickInvoiceDto.serviceDate,
            dueDate: createQuickInvoiceDto.dueDate,
            subtotal: totals.subtotal,
            taxRate: createQuickInvoiceDto.taxRate,
            taxAmount: totals.taxAmount,
            total: totals.total,
            notes: createQuickInvoiceDto.notes || null,
            status: InvoiceStatus.DRAFT,
            isQuickInvoice: true,
            // Inline company details
            quickCompanyName: createQuickInvoiceDto.quickCompanyName || null,
            quickCompanyAddress: createQuickInvoiceDto.quickCompanyAddress || null,
            quickCompanyCity: createQuickInvoiceDto.quickCompanyCity || null,
            quickCompanyState: createQuickInvoiceDto.quickCompanyState || null,
            quickCompanyZipCode: createQuickInvoiceDto.quickCompanyZipCode || null,
            quickCompanyPhone: createQuickInvoiceDto.quickCompanyPhone || null,
            quickCompanyEmail: createQuickInvoiceDto.quickCompanyEmail || null,
            quickCompanyTaxNumber: createQuickInvoiceDto.quickCompanyTaxNumber || null,
            // Inline customer details
            quickCustomerName: createQuickInvoiceDto.quickCustomerName || null,
            quickCustomerEmail: createQuickInvoiceDto.quickCustomerEmail || null,
            quickCustomerPhone: createQuickInvoiceDto.quickCustomerPhone || null,
            quickCustomerAddress: createQuickInvoiceDto.quickCustomerAddress || null,
            quickCustomerCity: createQuickInvoiceDto.quickCustomerCity || null,
            quickCustomerState: createQuickInvoiceDto.quickCustomerState || null,
            quickCustomerZipCode: createQuickInvoiceDto.quickCustomerZipCode || null,
          },
        });

        // Create line items
        const lineItemsData = createQuickInvoiceDto.lineItems.map((item) => ({
          invoiceId: newInvoice.id,
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
        }));

        await tx.lineItem.createMany({
          data: lineItemsData,
        });

        return newInvoice;
      });

      // Return invoice with relations
      return await this.findById(userId, invoice.id);
    } catch (error) {
      // Let the global exception filter handle Prisma errors
      throw error;
    }
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
    const where = this.buildUserIsolatedWhere(userId);

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

    try {
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
    } catch (error) {
      // Let the global exception filter handle Prisma errors
      throw error;
    }
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

  async update(
    userId: string,
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<InvoiceWithRelations> {
    this.logger.log(`Update invoice request - userId: ${userId}, invoiceId: ${id}, fields: ${Object.keys(updateInvoiceDto).join(', ')}`);

    // Validate that at least one field is being updated
    if (Object.keys(updateInvoiceDto).length === 0) {
      this.logger.warn(`Update failed - no fields provided - userId: ${userId}, invoiceId: ${id}`);
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    // Validate invoice ownership
    try {
      await this.validateInvoiceOwnership(id, userId);
    } catch (error) {
      this.logger.error(`Update failed - invoice ownership validation failed - userId: ${userId}, invoiceId: ${id}`, error instanceof Error ? error.stack : String(error));
      throw error;
    }

    // If updating customer, verify it belongs to user
    if (updateInvoiceDto.customerId) {
      try {
        await this.validateCustomerOwnership(updateInvoiceDto.customerId, userId);
      } catch (error) {
        this.logger.error(`Update failed - customer ownership validation failed - userId: ${userId}, customerId: ${updateInvoiceDto.customerId}`, error instanceof Error ? error.stack : String(error));
        throw error;
      }
    }

    const existingInvoice = await this.prisma.invoice.findFirst({
      where: this.buildUserIsolatedWhere(userId, { id }),
      include: {
        lineItems: true,
      },
    });

    if (!existingInvoice) {
      this.logger.error(`Update failed - invoice not found - userId: ${userId}, invoiceId: ${id}`);
      throw new NotFoundException('Invoice not found or access denied');
    }

    // Validate dates if provided
    if (updateInvoiceDto.serviceDate || updateInvoiceDto.dueDate) {
      const serviceDate = updateInvoiceDto.serviceDate || existingInvoice.serviceDate;
      const dueDate = updateInvoiceDto.dueDate || existingInvoice.dueDate;
      
      try {
        this.validateInvoiceDates(serviceDate, dueDate);
      } catch (error) {
        this.logger.error(`Update failed - date validation failed - userId: ${userId}, invoiceId: ${id}, serviceDate: ${serviceDate}, dueDate: ${dueDate}`, error instanceof Error ? error.stack : String(error));
        throw error;
      }
    }

    try {
      // Update invoice with line items in a transaction
      await this.prisma.$transaction(async (tx) => {
        let updateData: any = { ...updateInvoiceDto };

        // If line items are being updated, recalculate totals
        if (updateInvoiceDto.lineItems) {
          this.logger.log(`Updating line items - userId: ${userId}, invoiceId: ${id}, lineItemCount: ${updateInvoiceDto.lineItems.length}`);
          
          const taxRate = updateInvoiceDto.taxRate ?? existingInvoice.taxRate;
          const totals = this.calculateTotals(updateInvoiceDto.lineItems, taxRate);
          
          updateData = {
            ...updateData,
            subtotal: totals.subtotal,
            taxAmount: totals.taxAmount,
            total: totals.total,
          };

          // Delete existing line items (atomic replacement)
          const deleteResult = await tx.lineItem.deleteMany({
            where: { invoiceId: id },
          });
          
          this.logger.log(`Deleted existing line items - userId: ${userId}, invoiceId: ${id}, deletedCount: ${deleteResult.count}`);

          // Create new line items
          const lineItemsData = updateInvoiceDto.lineItems.map((item) => ({
            invoiceId: id,
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate,
          }));

          await tx.lineItem.createMany({
            data: lineItemsData,
          });
          
          this.logger.log(`Created new line items - userId: ${userId}, invoiceId: ${id}, createdCount: ${lineItemsData.length}`);
        } else if (updateInvoiceDto.taxRate !== undefined) {
          // If only tax rate is updated, recalculate with existing line items
          this.logger.log(`Recalculating totals with new tax rate - userId: ${userId}, invoiceId: ${id}, taxRate: ${updateInvoiceDto.taxRate}`);
          
          const existingLineItems = await tx.lineItem.findMany({
            where: { invoiceId: id },
          });

          const lineItemDtos: CreateLineItemDto[] = existingLineItems.map(item => ({
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
          }));

          const totals = this.calculateTotals(lineItemDtos, updateInvoiceDto.taxRate);
          
          updateData = {
            ...updateData,
            subtotal: totals.subtotal,
            taxAmount: totals.taxAmount,
            total: totals.total,
          };
        }

        // Remove lineItems from updateData as it's handled separately
        delete updateData.lineItems;

        // Update the invoice with additional safety check
        const updateResult = await tx.invoice.updateMany({
          where: this.buildUserIsolatedWhere(userId, { id }),
          data: updateData,
        });

        if (updateResult.count === 0) {
          this.logger.error(`Update failed - invoice not found during update - userId: ${userId}, invoiceId: ${id}`);
          throw new NotFoundException('Invoice not found or access denied');
        }
        
        this.logger.log(`Invoice updated successfully - userId: ${userId}, invoiceId: ${id}`);
      });

      // Return updated invoice with relations
      return await this.findById(userId, id);
    } catch (error) {
      // Log database errors
      if (error && typeof error === 'object' && 'code' in error) {
        this.logger.error(`Update failed - database error - userId: ${userId}, invoiceId: ${id}, errorCode: ${(error as any).code}, errorMessage: ${(error as any).message}`, error instanceof Error ? error.stack : String(error));
      }
      // Let the global exception filter handle Prisma errors
      throw error;
    }
  }

  async updateStatus(
    userId: string,
    id: string,
    updateStatusDto: UpdateInvoiceStatusDto,
  ): Promise<InvoiceWithRelations> {
    // Validate invoice ownership
    await this.validateInvoiceOwnership(id, userId);

    try {
      // Update invoice status with additional safety check
      const updateResult = await this.prisma.invoice.updateMany({
        where: this.buildUserIsolatedWhere(userId, { id }),
        data: { status: updateStatusDto.status },
      });

      if (updateResult.count === 0) {
        throw new NotFoundException('Invoice not found or access denied');
      }

      // Return updated invoice with relations
      return await this.findById(userId, id);
    } catch (error) {
      // Let the global exception filter handle Prisma errors
      throw error;
    }
  }

  async delete(userId: string, id: string): Promise<void> {
    this.logger.log(`Delete invoice request - userId: ${userId}, invoiceId: ${id}`);

    // Validate invoice ownership before deletion
    try {
      await this.validateInvoiceOwnership(id, userId);
    } catch (error) {
      this.logger.error(`Delete failed - invoice ownership validation failed - userId: ${userId}, invoiceId: ${id}`, error instanceof Error ? error.stack : String(error));
      throw error;
    }

    try {
      // Get line item count before deletion for logging
      const lineItemCount = await this.prisma.lineItem.count({
        where: { invoiceId: id },
      });

      // Delete invoice with additional safety check (line items will be deleted automatically due to cascade)
      const deleteResult = await this.prisma.invoice.deleteMany({
        where: this.buildUserIsolatedWhere(userId, { id }),
      });

      if (deleteResult.count === 0) {
        this.logger.error(`Delete failed - invoice not found during deletion - userId: ${userId}, invoiceId: ${id}`);
        throw new NotFoundException('Invoice not found or access denied');
      }

      // Verify cascade deletion occurred
      const remainingLineItems = await this.prisma.lineItem.count({
        where: { invoiceId: id },
      });

      if (remainingLineItems > 0) {
        this.logger.error(`Delete warning - cascade deletion may have failed - userId: ${userId}, invoiceId: ${id}, remainingLineItems: ${remainingLineItems}`);
      }

      this.logger.log(`Invoice deleted successfully - userId: ${userId}, invoiceId: ${id}, deletedLineItems: ${lineItemCount}`);
    } catch (error) {
      // Log database errors
      if (error && typeof error === 'object' && 'code' in error) {
        this.logger.error(`Delete failed - database error - userId: ${userId}, invoiceId: ${id}, errorCode: ${(error as any).code}, errorMessage: ${(error as any).message}`, error instanceof Error ? error.stack : String(error));
      }
      // Let the global exception filter handle Prisma errors
      throw error;
    }
  }

  async generateInvoiceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;

    // Find the highest invoice number for the current year
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      // Extract the number part and increment
      const numberPart = lastInvoice.invoiceNumber.replace(prefix, '');
      nextNumber = parseInt(numberPart, 10) + 1;
    }

    // Format with leading zeros (3 digits)
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    return `${prefix}${formattedNumber}`;
  }

  calculateTotals(lineItems: CreateLineItemDto[], taxRate: number): InvoiceTotals {
    // Calculate subtotal
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.rate);
    }, 0);

    // Calculate tax amount
    const taxAmount = subtotal * taxRate;

    // Calculate total
    const total = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimal places
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
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