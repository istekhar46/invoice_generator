import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { buildUploadOptions, CloudinaryUploadOptions } from '../config/cloudinary.config';

/**
 * CloudinaryService handles all interactions with Cloudinary API
 * Responsible for uploading, deleting, and managing image files in cloud storage
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  /**
   * Upload logo file to Cloudinary
   * Accepts a file buffer from multipart upload and stores it in Cloudinary
   * 
   * @param file - Express.Multer.File object containing file buffer and metadata
   * @param userId - User ID for organizing files and tagging
   * @returns Promise<string> - Secure URL of uploaded file from Cloudinary CDN
   * @throws BadRequestException - If file validation fails
   * @throws InternalServerErrorException - If upload fails
   */
  async uploadLogoFile(file: Express.Multer.File, userId: string): Promise<string> {
    try {
      // Validate file exists and has buffer
      if (!file || !file.buffer) {
        throw new BadRequestException('No file provided or file buffer is empty');
      }

      // Validate MIME type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, and GIF images are allowed.',
        );
      }

      // Validate file size (5MB limit - 5242880 bytes)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new BadRequestException(
          'File size too large. Maximum allowed size is 5MB.',
        );
      }

      this.logger.debug(`Uploading logo for user: ${userId}, file: ${file.originalname}`);

      // Prepare upload options with user context
      const uploadOptions = buildUploadOptions(userId, file.originalname);

      // Upload to Cloudinary using buffer stream
      const response = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions as any,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          },
        );

        // Pipe file buffer to upload stream
        uploadStream.end(file.buffer);
      });

      const uploadResult = response as any;

      // Validate response
      if (!uploadResult?.secure_url) {
        throw new InternalServerErrorException(
          'Upload succeeded but no URL returned from Cloudinary',
        );
      }

      this.logger.log(
        `✓ Logo uploaded successfully for user: ${userId}, URL: ${uploadResult.secure_url}`,
      );

      return uploadResult.secure_url;
    } catch (error: any) {
      this.logger.error(`Failed to upload logo for user ${userId}:`, error);

      // Re-throw known exceptions
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      // Wrap unknown errors
      if (error?.message?.includes('Invalid API Key')) {
        throw new InternalServerErrorException(
          'Cloudinary configuration error: Invalid API credentials',
        );
      }

      if (error?.message?.includes('rate limit')) {
        throw new InternalServerErrorException(
          'Upload service temporarily unavailable. Please try again later.',
        );
      }

      throw new InternalServerErrorException(
        `Failed to upload file: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete logo file from Cloudinary
   * Extracts public ID from Cloudinary URL and removes the asset
   * Gracefully handles cases where file doesn't exist
   * 
   * @param logoUrl - Cloudinary secure URL to delete
   * @param userId - User ID for logging/context
   * @returns Promise<void>
   */
  async deleteLogoFile(logoUrl: string, userId: string): Promise<void> {
    try {
      if (!logoUrl) {
        this.logger.debug(`No logo URL to delete for user: ${userId}`);
        return;
      }

      // Check if URL is from Cloudinary (not local path)
      if (!logoUrl.includes('cloudinary') && !logoUrl.includes('res.cloudinary')) {
        this.logger.debug(`Skipping deletion of non-Cloudinary URL for user: ${userId}`);
        return;
      }

      // Extract public_id from Cloudinary URL
      // URL format: https://res.cloudinary.com/cloud-name/image/upload/version/public_id.format
      // We need to extract just "logos/userId/company-logo"
      const publicId = this.extractPublicIdFromUrl(logoUrl);

      if (!publicId) {
        this.logger.warn(`Could not extract public ID from URL: ${logoUrl}`);
        return;
      }

      this.logger.debug(`Deleting logo from Cloudinary: ${publicId}, user: ${userId}`);

      // Delete from Cloudinary
      const deleteResult = await cloudinary.uploader.destroy(publicId);

      if (deleteResult.result === 'ok') {
        this.logger.log(`✓ Logo deleted successfully for user: ${userId}`);
      } else if (deleteResult.result === 'not found') {
        this.logger.debug(`Logo not found in Cloudinary (already deleted): ${publicId}`);
        // Not an error - file was already deleted
      } else {
        this.logger.warn(`Unexpected deletion result for ${publicId}: ${deleteResult.result}`);
      }
    } catch (error: any) {
      // Log but don't throw - deletion failures shouldn't block operations
      this.logger.warn(
        `Failed to delete logo for user ${userId}: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Get optimized logo URL with transformations
   * Applies Cloudinary transformations for different contexts (thumbnail, responsive, etc.)
   * 
   * @param logoUrl - Original Cloudinary URL
   * @param width - Optional width in pixels
   * @param height - Optional height in pixels
   * @param quality - Optional quality (1-100, default 80)
   * @returns string - Transformed URL
   */
  getOptimizedLogoUrl(
    logoUrl: string,
    options?: { width?: number; height?: number; quality?: number },
  ): string {
    if (!logoUrl) {
      return '';
    }

    // If not a Cloudinary URL, return as-is
    if (!logoUrl.includes('cloudinary') && !logoUrl.includes('res.cloudinary')) {
      return logoUrl;
    }

    try {
      const width = options?.width || 200;
      const height = options?.height || 200;
      const quality = options?.quality || 80;

      // Use Cloudinary URL transformation
      // Format: https://res.cloudinary.com/cloud/image/upload/w_200,h_200,c_fill,q_80/public_id
      const publicId = this.extractPublicIdFromUrl(logoUrl);

      if (!publicId) {
        return logoUrl;
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const transformedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},h_${height},c_fill,q_${quality}/${publicId}`;

      return transformedUrl;
    } catch (error: any) {
      this.logger.warn(`Failed to generate optimized URL: ${error?.message}`);
      return logoUrl;
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   * Handles multiple URL formats
   * 
   * @param url - Cloudinary URL
   * @returns string - Public ID or empty string if extraction fails
   */
  private extractPublicIdFromUrl(url: string): string {
    try {
      // Format: https://res.cloudinary.com/cloud-name/image/upload/version/public_id.format
      // We want: public_id (including any folder paths like: logos/userid/company-logo)

      // Remove query parameters
      const urlWithoutQuery = url.split('?')[0];

      // Split by 'upload/' and take the part after
      const parts = urlWithoutQuery.split('upload/');
      if (parts.length < 2) {
        return '';
      }

      let remaining = parts[1];

      // Remove version if present (looks like: v1234567890/)
      remaining = remaining.replace(/^v\d+\//, '');

      // Remove file extension and get public_id
      const publicId = remaining.split('.')[0];

      return publicId;
    } catch (error: any) {
      this.logger.warn(`Error extracting public ID from URL: ${error?.message}`);
      return '';
    }
  }
}
