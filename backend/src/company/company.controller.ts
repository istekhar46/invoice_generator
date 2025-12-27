import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { plainToClass } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserContextInterceptor } from '../auth/interceptors/user-context.interceptor';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompanyService } from './company.service';
import {
  CreateCompanyProfileDto,
  UpdateCompanyProfileDto,
  CompanyProfileResponseDto,
  UploadLogoDto,
} from './dto';

@ApiTags('Company')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@UseInterceptors(UserContextInterceptor)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('profile')
  @ApiOperation({ summary: 'Create company profile' })
  @ApiBody({ type: CreateCompanyProfileDto })
  @ApiResponse({
    status: 201,
    description: 'Company profile created successfully',
    type: CompanyProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Company profile already exists for this user',
  })
  async createProfile(
    @CurrentUser('id') userId: string,
    @Body() createCompanyProfileDto: CreateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    const companyProfile = await this.companyService.create(
      userId,
      createCompanyProfileDto,
    );
    return plainToClass(CompanyProfileResponseDto, companyProfile, {
      excludeExtraneousValues: true,
    });
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get company profile' })
  @ApiResponse({
    status: 200,
    description: 'Company profile retrieved successfully',
    type: CompanyProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getProfile(
    @CurrentUser('id') userId: string,
  ): Promise<CompanyProfileResponseDto | null> {
    const companyProfile = await this.companyService.findByUserId(userId);
    
    if (!companyProfile) {
      return null;
    }
    
    return plainToClass(CompanyProfileResponseDto, companyProfile, {
      excludeExtraneousValues: true,
    });
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update company profile' })
  @ApiBody({ type: UpdateCompanyProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Company profile updated successfully',
    type: CompanyProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Company profile not found',
  })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateCompanyProfileDto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    const updatedProfile = await this.companyService.update(
      userId,
      updateCompanyProfileDto,
    );
    return plainToClass(CompanyProfileResponseDto, updatedProfile, {
      excludeExtraneousValues: true,
    });
  }

  @Delete('profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete company profile' })
  @ApiResponse({
    status: 204,
    description: 'Company profile deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Company profile not found',
  })
  async deleteProfile(@CurrentUser('id') userId: string): Promise<void> {
    await this.companyService.delete(userId);
  }

  @Post('profile/logo')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiOperation({ summary: 'Upload company logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Company logo file',
    type: UploadLogoDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Logo uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        logoUrl: {
          type: 'string',
          example: '/uploads/logos/logo-user123-1640995200000.jpg',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or size',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Company profile not found',
  })
  async uploadLogo(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<{ logoUrl: string }> {
    const logoUrl = await this.companyService.uploadLogo(userId, file);
    return { logoUrl };
  }

  @Delete('profile/logo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete company logo' })
  @ApiResponse({
    status: 204,
    description: 'Logo deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Company profile not found or no logo to delete',
  })
  async deleteLogo(@CurrentUser('id') userId: string): Promise<void> {
    await this.companyService.deleteLogo(userId);
  }
}