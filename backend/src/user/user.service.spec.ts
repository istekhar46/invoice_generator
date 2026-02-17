import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashedPassword',
        photoURL: null,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashedPassword',
        photoURL: null,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto = { displayName: 'Updated Name' };
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
    });

    it('should throw BadRequestException when no fields provided', async () => {
      await expect(service.update('1', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update('1', { displayName: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: await bcrypt.hash('oldPassword', 12),
        photoURL: null,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const changePasswordDto = {
        oldPassword: 'oldPassword',
        newPassword: 'newPassword',
      };

      await service.changePassword('1', changePasswordDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          passwordHash: expect.any(String),
        },
      });
    });

    it('should throw BadRequestException when new password same as old', async () => {
      const changePasswordDto = {
        oldPassword: 'samePassword',
        newPassword: 'samePassword',
      };

      await expect(service.changePassword('1', changePasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException for OAuth-only user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: null, // OAuth-only user
        photoURL: null,
        googleId: 'google123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const changePasswordDto = {
        oldPassword: 'oldPassword',
        newPassword: 'newPassword',
      };

      await expect(service.changePassword('1', changePasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashedPassword',
        photoURL: null,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      await service.delete('1');

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.delete('1')).rejects.toThrow(NotFoundException);
    });
  });
});
