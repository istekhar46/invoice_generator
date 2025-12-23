import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResourceOwnershipGuard } from './resource-ownership.guard';
import { PrismaService } from '../../database/prisma.service';
import { RESOURCE_OWNERSHIP_KEY } from '../decorators/resource-ownership.decorator';

describe('ResourceOwnershipGuard', () => {
  let guard: ResourceOwnershipGuard;
  let reflector: Reflector;
  let prismaService: PrismaService;

  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
    },
    companyProfile: {
      findUnique: jest.fn(),
    },
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceOwnershipGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<ResourceOwnershipGuard>(ResourceOwnershipGuard);
    reflector = module.get<Reflector>(Reflector);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    user: any = { id: 'user123' },
    params: any = { id: 'resource123' },
  ): ExecutionContext => {
    const mockHandler = jest.fn();
    const mockClass = jest.fn();
    
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
        }),
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
    } as any;
  };

  describe('canActivate', () => {
    it('should return true when no resource ownership config is defined', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        RESOURCE_OWNERSHIP_KEY,
        [expect.any(Function), expect.any(Function)],
      );
    });

    it('should return true when user or resourceId is missing', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        entity: 'customer',
        param: 'id',
      });

      // Test with missing user
      let context = createMockExecutionContext(null);
      let result = await guard.canActivate(context);
      expect(result).toBe(true);

      // Test with missing resourceId
      context = createMockExecutionContext({ id: 'user123' }, {});
      result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow access when user owns the customer resource', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        entity: 'customer',
        param: 'id',
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'resource123',
        userId: 'user123',
      });

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'resource123' },
        select: { id: true, userId: true },
      });
    });

    it('should allow access when user owns the invoice resource', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        entity: 'invoice',
        param: 'id',
      });

      mockPrismaService.invoice.findUnique.mockResolvedValue({
        id: 'resource123',
        userId: 'user123',
      });

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: 'resource123' },
        select: { id: true, userId: true },
      });
    });

    it('should allow access when user owns the company profile resource', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        entity: 'companyProfile',
        param: 'id',
      });

      mockPrismaService.companyProfile.findUnique.mockResolvedValue({
        id: 'resource123',
        userId: 'user123',
      });

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.companyProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'resource123' },
        select: { id: true, userId: true },
      });
    });

    it('should throw NotFoundException when resource does not exist', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        entity: 'customer',
        param: 'id',
      });

      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'resource123' },
        select: { id: true, userId: true },
      });
    });

    it('should throw ForbiddenException when user does not own the resource', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        entity: 'customer',
        param: 'id',
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'resource123',
        userId: 'different-user',
      });

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'resource123' },
        select: { id: true, userId: true },
      });
    });

    it('should use custom userField when specified', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        entity: 'customer',
        param: 'id',
        userField: 'ownerId',
      });

      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'resource123',
        ownerId: 'user123',
      });

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException for database errors', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        entity: 'customer',
        param: 'id',
      });

      mockPrismaService.customer.findUnique.mockRejectedValue(new Error('Database error'));

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw error for unsupported entity type', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        entity: 'unsupported',
        param: 'id',
      });

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});