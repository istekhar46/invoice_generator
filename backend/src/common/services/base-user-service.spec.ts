import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BaseUserService } from './base-user-service';
import { PrismaService } from '../../database/prisma.service';

// Create a concrete implementation for testing
class TestUserService extends BaseUserService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // Expose protected methods for testing
  public async testValidateUserExists(userId: string): Promise<void> {
    return this.validateUserExists(userId);
  }

  public async testValidateCustomerOwnership(customerId: string, userId: string): Promise<void> {
    return this.validateCustomerOwnership(customerId, userId);
  }

  public async testValidateInvoiceOwnership(invoiceId: string, userId: string): Promise<void> {
    return this.validateInvoiceOwnership(invoiceId, userId);
  }

  public async testValidateCompanyProfileOwnership(userId: string): Promise<void> {
    return this.validateCompanyProfileOwnership(userId);
  }

  public testBuildUserIsolatedWhere(userId: string, additionalWhere: any = {}): any {
    return this.buildUserIsolatedWhere(userId, additionalWhere);
  }

  public async testValidateResourceOwnership(
    model: any,
    resourceId: string,
    userId: string,
    resourceName: string,
  ): Promise<void> {
    return this.validateResourceOwnership(model, resourceId, userId, resourceName);
  }
}

describe('BaseUserService', () => {
  let service: TestUserService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
    },
    companyProfile: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestUserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TestUserService>(TestUserService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUserExists', () => {
    it('should pass when user exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user123' });

      await expect(service.testValidateUserExists('user123')).resolves.not.toThrow();

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: { id: true },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.testValidateUserExists('user123')).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: { id: true },
      });
    });
  });

  describe('validateCustomerOwnership', () => {
    it('should pass when customer belongs to user', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({ id: 'customer123' });

      await expect(service.testValidateCustomerOwnership('customer123', 'user123')).resolves.not.toThrow();

      expect(mockPrismaService.customer.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'customer123',
          userId: 'user123',
        },
        select: { id: true },
      });
    });

    it('should throw NotFoundException when customer does not belong to user', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(service.testValidateCustomerOwnership('customer123', 'user123')).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.customer.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'customer123',
          userId: 'user123',
        },
        select: { id: true },
      });
    });
  });

  describe('validateInvoiceOwnership', () => {
    it('should pass when invoice belongs to user', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue({ id: 'invoice123' });

      await expect(service.testValidateInvoiceOwnership('invoice123', 'user123')).resolves.not.toThrow();

      expect(mockPrismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'invoice123',
          userId: 'user123',
        },
        select: { id: true },
      });
    });

    it('should throw NotFoundException when invoice does not belong to user', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);

      await expect(service.testValidateInvoiceOwnership('invoice123', 'user123')).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'invoice123',
          userId: 'user123',
        },
        select: { id: true },
      });
    });
  });

  describe('validateCompanyProfileOwnership', () => {
    it('should pass when company profile belongs to user', async () => {
      mockPrismaService.companyProfile.findUnique.mockResolvedValue({ id: 'profile123' });

      await expect(service.testValidateCompanyProfileOwnership('user123')).resolves.not.toThrow();

      expect(mockPrismaService.companyProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        select: { id: true },
      });
    });

    it('should throw NotFoundException when company profile does not exist', async () => {
      mockPrismaService.companyProfile.findUnique.mockResolvedValue(null);

      await expect(service.testValidateCompanyProfileOwnership('user123')).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.companyProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        select: { id: true },
      });
    });
  });

  describe('buildUserIsolatedWhere', () => {
    it('should build where clause with only userId', () => {
      const result = service.testBuildUserIsolatedWhere('user123');

      expect(result).toEqual({
        userId: 'user123',
      });
    });

    it('should build where clause with userId and additional conditions', () => {
      const additionalWhere = {
        status: 'ACTIVE',
        name: { contains: 'test' },
      };

      const result = service.testBuildUserIsolatedWhere('user123', additionalWhere);

      expect(result).toEqual({
        userId: 'user123',
        status: 'ACTIVE',
        name: { contains: 'test' },
      });
    });

    it('should handle empty additional where clause', () => {
      const result = service.testBuildUserIsolatedWhere('user123', {});

      expect(result).toEqual({
        userId: 'user123',
      });
    });
  });

  describe('validateResourceOwnership', () => {
    it('should pass when resource belongs to user', async () => {
      const mockModel = {
        findFirst: jest.fn().mockResolvedValue({ id: 'resource123' }),
      };

      await expect(
        service.testValidateResourceOwnership(mockModel, 'resource123', 'user123', 'TestResource'),
      ).resolves.not.toThrow();

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'resource123',
          userId: 'user123',
        },
        select: { id: true },
      });
    });

    it('should throw NotFoundException when resource does not belong to user', async () => {
      const mockModel = {
        findFirst: jest.fn().mockResolvedValue(null),
      };

      await expect(
        service.testValidateResourceOwnership(mockModel, 'resource123', 'user123', 'TestResource'),
      ).rejects.toThrow(NotFoundException);

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'resource123',
          userId: 'user123',
        },
        select: { id: true },
      });
    });
  });
});