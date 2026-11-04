import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseUserService } from '../common/services/base-user-service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
  PaginatedResponseDto,
} from './dto';

@Injectable()
export class CustomerService extends BaseUserService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(userId: string, createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // Validate user exists
    await this.validateUserExists(userId);

    // Additional validation
    this.validateCustomerData(createCustomerDto);

    try {
      // Create customer with user isolation
      const customer = await this.prisma.customer.create({
        data: {
          userId,
          ...createCustomerDto,
          // Normalize short state codes (e.g. CA, NY) to uppercase, keep full state names
          state:
            createCustomerDto.state.trim().length <= 3
              ? createCustomerDto.state.trim().toUpperCase()
              : createCustomerDto.state.trim(),
          // Normalize email to lowercase
          email: createCustomerDto.email.toLowerCase(),
        },
      });

      return customer;
    } catch (error) {
      // Let the global exception filter handle Prisma errors
      throw error;
    }
  }

  async findAll(userId: string, query: CustomerQueryDto): Promise<PaginatedResponseDto<Customer>> {
    const { search, sortBy = 'name', sortOrder = 'asc', page = 1, limit = 10 } = query;

    // Build where clause with mandatory user isolation
    const where = this.buildUserIsolatedWhere(userId);

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    try {
      // Get total count for pagination
      const total = await this.prisma.customer.count({ where });

      // Get customers with pagination and sorting
      const customers = await this.prisma.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        data: customers,
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

  async findById(userId: string, id: string): Promise<Customer> {
    // Use the base service method for validation
    await this.validateResourceOwnership(this.prisma.customer, id, userId, 'Customer');

    const customer = await this.prisma.customer.findFirst({
      where: this.buildUserIsolatedWhere(userId, { id }),
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(
    userId: string,
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    // Validate that at least one field is being updated
    if (Object.keys(updateCustomerDto).length === 0) {
      throw new BadRequestException('At least one field must be provided for update');
    }

    // Validate ownership using base service method
    await this.validateResourceOwnership(this.prisma.customer, id, userId, 'Customer');

    // Additional validation for update data
    this.validateCustomerData(updateCustomerDto);

    try {
      // Prepare update data with normalization
      const updateData = { ...updateCustomerDto };
      if (updateData.state) {
        updateData.state =
          updateData.state.trim().length <= 3
            ? updateData.state.trim().toUpperCase()
            : updateData.state.trim();
      }
      if (updateData.email) {
        updateData.email = updateData.email.toLowerCase();
      }

      // Update customer with additional safety check
      const updatedCustomer = await this.prisma.customer.updateMany({
        where: this.buildUserIsolatedWhere(userId, { id }),
        data: updateData,
      });

      if (updatedCustomer.count === 0) {
        throw new NotFoundException('Customer not found or access denied');
      }

      // Return the updated customer
      return await this.findById(userId, id);
    } catch (error) {
      // Let the global exception filter handle Prisma errors
      throw error;
    }
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        // Block incoming invoice FK writes while checking retained customer history.
        const found = await tx.$queryRaw<
          { id: string }[]
        >`SELECT "id" FROM "customers" WHERE "id" = ${id} AND "userId" = ${userId} FOR UPDATE`;
        if (!found[0]) throw new NotFoundException('Customer not found or access denied');
        if (await tx.invoice.count({ where: { userId, customerId: id } }))
          throw new BadRequestException(
            'Cannot delete a customer with saved invoices. Retain the customer to preserve invoice history.',
          );
        await tx.customer.delete({ where: { id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  private validateCustomerData(data: CreateCustomerDto | UpdateCustomerDto): void {
    // Validate phone number format (between 7 and 15 digits)
    if (data.phone) {
      const phoneDigits = data.phone.replace(/\D/g, '');
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        throw new BadRequestException('Phone number must contain between 7 and 15 digits');
      }
    }

    // Validate ZIP / postal code format
    if (data.zipCode) {
      const zipPattern = /^[a-zA-Z0-9][\w\s-]{1,19}$/;
      if (!zipPattern.test(data.zipCode)) {
        throw new BadRequestException(
          'Postal code must be a valid format (e.g. 10001, 412308, SW1A 1AA)',
        );
      }
    }

    // Validate state / province / region
    if (data.state) {
      const stateLength = data.state.trim().length;
      if (stateLength < 2 || stateLength > 100) {
        throw new BadRequestException(
          'State / Province / Region must be between 2 and 100 characters',
        );
      }
    }
  }
}
