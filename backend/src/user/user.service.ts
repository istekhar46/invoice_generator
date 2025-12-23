import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { BaseUserService } from '../common/services/base-user-service';
import { UpdateUserDto, ChangePasswordDto } from './dto';

@Injectable()
export class UserService extends BaseUserService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Validate that at least one field is being updated
    if (Object.keys(updateUserDto).length === 0) {
      throw new BadRequestException('At least one field must be provided for update');
    }

    // Validate user exists
    await this.validateUserExists(id);

    try {
      // Update user with additional safety check
      const updateResult = await this.prisma.user.updateMany({
        where: { id },
        data: updateUserDto,
      });

      if (updateResult.count === 0) {
        throw new NotFoundException('User not found or access denied');
      }

      // Return updated user
      return await this.findById(id);
    } catch (error) {
      // Let the global exception filter handle Prisma errors
      throw error;
    }
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { oldPassword, newPassword } = changePasswordDto;

    // Validate that new password is different from old password
    if (oldPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Validate user exists and get user data
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has a password (might be OAuth-only user)
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Cannot change password for OAuth-only account. Please set up a password first.',
      );
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      user.passwordHash,
    );

    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password with additional safety check
    const updateResult = await this.prisma.user.updateMany({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    if (updateResult.count === 0) {
      throw new NotFoundException('User not found or access denied');
    }
  }

  async delete(id: string): Promise<void> {
    // Validate user exists
    await this.validateUserExists(id);

    // Delete user with additional safety check (cascade will handle related records)
    const deleteResult = await this.prisma.user.deleteMany({
      where: { id },
    });

    if (deleteResult.count === 0) {
      throw new NotFoundException('User not found or access denied');
    }
  }
}