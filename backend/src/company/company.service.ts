import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CompanyProfile } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseUserService } from '../common/services/base-user-service';
import { CreateCompanyProfileDto, UpdateCompanyProfileDto } from './dto';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class CompanyService extends BaseUserService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    userId: string,
    createCompanyProfileDto: CreateCompanyProfileDto,
  ): Promise<CompanyProfile> {
    // Validate user exists
    await this.validateUserExists(userId);

    // Check if user already has a company profile (enforce one profile per user)
    const existingProfile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new ConflictException(
        'User already has a company profile. Only one profile per user is allowed.',
      );
    }

    // Additional business validation
    this.validateBusinessData(createCompanyProfileDto);

    try {
      // Create company profile
      const companyProfile = await this.prisma.companyProfile.create({
        data: {
          userId,
          ...createCompanyProfileDto,
          // Normalize state to uppercase
          state: createCompanyProfileDto.state.toUpperCase(),
          // Normalize email to lowercase
          email: createCompanyProfileDto.email.toLowerCase(),
        },
      });

      return companyProfile;
    } catch (error) {
      // Let the global exception filter handle Prisma errors
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<CompanyProfile> {
    const companyProfile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!companyProfile) {
      throw new NotFoundException('Company profile not found');
    }

    return companyProfile;
  }

  async update(
    userId: string,
    updateCompanyProfileDto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfile> {
    // Validate that at least one field is being updated
    if (Object.keys(updateCompanyProfileDto).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    // Validate company profile ownership
    await this.validateCompanyProfileOwnership(userId);

    // Additional business validation for update data
    this.validateBusinessData(updateCompanyProfileDto);

    try {
      // Prepare update data with normalization
      const updateData = { ...updateCompanyProfileDto };
      if (updateData.state) {
        updateData.state = updateData.state.toUpperCase();
      }
      if (updateData.email) {
        updateData.email = updateData.email.toLowerCase();
      }

      // Update company profile with additional safety check
      const updatedProfile = await this.prisma.companyProfile.updateMany({
        where: { userId },
        data: updateData,
      });

      if (updatedProfile.count === 0) {
        throw new NotFoundException('Company profile not found or access denied');
      }

      // Return the updated profile
      return await this.findByUserId(userId);
    } catch (error) {
      // Let the global exception filter handle Prisma errors
      throw error;
    }
  }

  async delete(userId: string): Promise<void> {
    // Validate company profile ownership
    await this.validateCompanyProfileOwnership(userId);

    const existingProfile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    // Delete logo file if it exists
    if (existingProfile?.logoUrl) {
      await this.deleteLogo(existingProfile.logoUrl);
    }

    // Delete company profile with additional safety check
    const deleteResult = await this.prisma.companyProfile.deleteMany({
      where: { userId },
    });

    if (deleteResult.count === 0) {
      throw new NotFoundException('Company profile not found or access denied');
    }
  }

  async uploadLogo(userId: string, file: Express.Multer.File): Promise<string> {
    // Validate company profile ownership
    await this.validateCompanyProfileOwnership(userId);

    const existingProfile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and GIF images are allowed.',
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size too large. Maximum allowed size is 5MB.',
      );
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `logo-${userId}-${Date.now()}${fileExtension}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
    const filePath = path.join(uploadDir, fileName);

    try {
      // Ensure upload directory exists
      await fs.mkdir(uploadDir, { recursive: true });

      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Generate URL for the uploaded file
      const logoUrl = `/uploads/logos/${fileName}`;

      // Delete old logo if it exists
      if (existingProfile?.logoUrl) {
        await this.deleteLogo(existingProfile.logoUrl);
      }

      // Update company profile with new logo URL using additional safety check
      const updateResult = await this.prisma.companyProfile.updateMany({
        where: { userId },
        data: { logoUrl },
      });

      if (updateResult.count === 0) {
        throw new NotFoundException('Company profile not found or access denied');
      }

      return logoUrl;
    } catch (error) {
      // Clean up file if database update fails
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        // Ignore unlink errors
      }
      throw error;
    }
  }

  private async deleteLogo(logoUrl: string): Promise<void> {
    try {
      // Extract filename from URL
      const fileName = path.basename(logoUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'logos', fileName);
      
      // Delete file if it exists
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore file deletion errors (file might not exist)
    }
  }

  private validateBusinessData(
    data: CreateCompanyProfileDto | UpdateCompanyProfileDto,
  ): void {
    // Additional business logic validation
    if (data.defaultLaborRate !== undefined && data.defaultLaborRate < 0) {
      throw new BadRequestException('Default labor rate cannot be negative');
    }

    if (data.defaultTaxRate !== undefined && (data.defaultTaxRate < 0 || data.defaultTaxRate > 1)) {
      throw new BadRequestException('Default tax rate must be between 0 and 1 (0% to 100%)');
    }

    // Validate that business email is different from personal email if provided
    if (data.email && data.businessName) {
      const businessDomain = data.email.split('@')[1];
      if (businessDomain && ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(businessDomain.toLowerCase())) {
        // This is just a warning, not an error - many small businesses use personal email providers
      }
    }

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
  }
}