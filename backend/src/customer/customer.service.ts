import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Customer } from '@prisma/client';
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
          // Normalize state to uppercase
          state: createCustomerDto.state.toUpperCase(),
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
        updateData.state = updateData.state.toUpperCase();
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
    // Validate ownership using base service method
    await this.validateResourceOwnership(this.prisma.customer, id, userId, 'Customer');

    // Check if customer has any invoices
    const invoiceCount = await this.prisma.invoice.count({
      where: this.buildUserIsolatedWhere(userId, { customerId: id }),
    });

    if (invoiceCount > 0) {
      throw new BadRequestException(
        'Cannot delete customer with existing invoices. Please delete all invoices first.',
      );
    }

    // Delete customer with additional safety check
    const deleteResult = await this.prisma.customer.deleteMany({
      where: this.buildUserIsolatedWhere(userId, { id }),
    });

    if (deleteResult.count === 0) {
      throw new NotFoundException('Customer not found or access denied');
    }
  }

  private validateCustomerData(data: CreateCustomerDto | UpdateCustomerDto): void {
    // Validate phone number format more strictly
    if (data.phone) {
      const phoneDigits = data.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        throw new BadRequestException('Phone number must contain exactly 10 digits');
      }
    }

    // Validate ZIP code format
    if (data.zipCode) {
      const zipPattern = /^\d{5}(-\d{4})?$/;
      if (!zipPattern.test(data.zipCode)) {
        throw new BadRequestException('ZIP code must be in format 12345 or 12345-6789');
      }
    }

    // Validate state code - accept 2-6 character strings for now
    if (data.state) {
      // Accept any string with 2-6 characters (alphanumeric or digits)
      if (data.state.length < 2 || data.state.length > 6) {
        throw new BadRequestException('State code must be between 2 and 6 characters');
      }
    }
  }
}
