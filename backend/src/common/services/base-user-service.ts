import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export abstract class BaseUserService {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Validates that a user exists
   */
  protected async validateUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Validates that a customer belongs to the specified user
   */
  protected async validateCustomerOwnership(
    customerId: string,
    userId: string,
  ): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        userId,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found or access denied');
    }
  }

  /**
   * Validates that an invoice belongs to the specified user
   */
  protected async validateInvoiceOwnership(
    invoiceId: string,
    userId: string,
  ): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId,
      },
      select: { id: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found or access denied');
    }
  }

  /**
   * Validates that a company profile belongs to the specified user
   */
  protected async validateCompanyProfileOwnership(
    userId: string,
  ): Promise<void> {
    const companyProfile = await this.prisma.companyProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found');
    }
  }

  /**
   * Ensures that all database queries include user isolation
   * This method can be used to build where clauses that always include userId
   */
  protected buildUserIsolatedWhere(userId: string, additionalWhere: any = {}): any {
    return {
      userId,
      ...additionalWhere,
    };
  }

  /**
   * Validates that a resource exists and belongs to the user
   * Generic method for any resource that has a userId field
   */
  protected async validateResourceOwnership(
    model: any,
    resourceId: string,
    userId: string,
    resourceName: string,
  ): Promise<void> {
    const resource = await model.findFirst({
      where: {
        id: resourceId,
        userId,
      },
      select: { id: true },
    });

    if (!resource) {
      throw new NotFoundException(`${resourceName} not found or access denied`);
    }
  }
}