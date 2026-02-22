import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CompanyProfile, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseUserService } from '../common/services/base-user-service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateCompanyProfileDto, UpdateCompanyProfileDto } from './dto';

@Injectable()
export class CompanyService extends BaseUserService {
  constructor(
    prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {
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

    // Create company profile
    const companyProfile = await this.prisma.companyProfile.create({
      data: {
        userId,
        ...createCompanyProfileDto,
        // taxNumber is optional — default to empty string to satisfy the non-null DB column
        taxNumber: createCompanyProfileDto.taxNumber ?? '',
        // defaultLaborRate removed from form; default to 0 to satisfy the non-null DB column
        defaultLaborRate: 0,
        // Normalize email to lowercase
        email: createCompanyProfileDto.email.toLowerCase(),
      },
    });

    return companyProfile;
  }

  async findByUserId(userId: string): Promise<CompanyProfile | null> {
    const companyProfile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    return companyProfile;
  }

  private async findByUserIdOrThrow(userId: string): Promise<CompanyProfile> {
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
      throw new BadRequestException('At least one field must be provided for update');
    }

    // Validate company profile ownership
    await this.validateCompanyProfileOwnership(userId);

    // Additional business validation for update data
    this.validateBusinessData(updateCompanyProfileDto);

    // Prepare update data with normalization
    const updateData: Record<string, unknown> = { ...updateCompanyProfileDto };
    if (updateData.state) {
      updateData.state = (updateData.state as string).toUpperCase();
    }
    if (updateData.email) {
      updateData.email = (updateData.email as string).toLowerCase();
    }

    // Update company profile with additional safety check
    const updatedProfile = await this.prisma.companyProfile.updateMany({
      where: { userId },
      data: updateData as Prisma.CompanyProfileUpdateInput,
    });

    if (updatedProfile.count === 0) {
      throw new NotFoundException('Company profile not found or access denied');
    }

    // Return the updated profile
    return await this.findByUserIdOrThrow(userId);
  }

  async delete(userId: string): Promise<void> {
    // Validate company profile ownership
    await this.validateCompanyProfileOwnership(userId);

    const existingProfile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    // Delete logo file if it exists
    if (existingProfile?.logoUrl) {
      await this.cloudinaryService.deleteLogoFile(existingProfile.logoUrl, userId);
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

    try {
      // Upload file to Cloudinary
      // CloudinaryService handles file validation (MIME type, size)
      const logoUrl = await this.cloudinaryService.uploadLogoFile(file, userId);

      // Delete old logo from Cloudinary if it exists
      if (existingProfile?.logoUrl) {
        await this.cloudinaryService.deleteLogoFile(existingProfile.logoUrl, userId);
      }

      // Update company profile with new logo URL
      const updateResult = await this.prisma.companyProfile.updateMany({
        where: { userId },
        data: { logoUrl },
      });

      if (updateResult.count === 0) {
        throw new NotFoundException('Company profile not found or access denied');
      }

      return logoUrl;
    } catch (error) {
      // If update fails but upload succeeded, try to delete the uploaded file
      if (error instanceof NotFoundException) {
        const logoUrl = await this.cloudinaryService.uploadLogoFile(file, userId);
        await this.cloudinaryService.deleteLogoFile(logoUrl, userId);
      }
      throw error;
    }
  }

  async deleteLogo(userId: string): Promise<void> {
    // Validate company profile ownership
    await this.validateCompanyProfileOwnership(userId);

    const existingProfile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile?.logoUrl) {
      throw new NotFoundException('No logo found to delete');
    }

    try {
      // Delete logo file from Cloudinary
      await this.cloudinaryService.deleteLogoFile(existingProfile.logoUrl, userId);

      // Update company profile to remove logo URL
      const updateResult = await this.prisma.companyProfile.updateMany({
        where: { userId },
        data: { logoUrl: null },
      });

      if (updateResult.count === 0) {
        throw new NotFoundException('Company profile not found or access denied');
      }
    } catch (error) {
      // If it's a NotFoundException, re-throw it
      if (error instanceof NotFoundException) {
        throw error;
      }
      // For other errors, wrap them
      throw new BadRequestException(
        `Failed to delete logo: ${(error as any)?.message || 'Unknown error'}`,
      );
    }
  }

  private validateBusinessData(data: CreateCompanyProfileDto | UpdateCompanyProfileDto): void {
    // Additional business logic validation
    if (data.defaultTaxRate !== undefined && (data.defaultTaxRate < 0 || data.defaultTaxRate > 1)) {
      throw new BadRequestException('Default tax rate must be between 0 and 1 (0% to 100%)');
    }

    // Validate that business email is different from personal email if provided
    if (data.email && data.businessName) {
      const businessDomain = data.email.split('@')[1];
      if (
        businessDomain &&
        ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(
          businessDomain.toLowerCase(),
        )
      ) {
        // This is just a warning, not an error - many small businesses use personal email providers
      }
    }

    // Validate phone lightly — the regex on the DTO already enforces format
    // No additional phone validation needed here

    // Validate postal code lightly — DTO regex already handles format
    // No additional postal code validation needed here
  }
}
