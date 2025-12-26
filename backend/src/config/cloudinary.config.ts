import { v2 as cloudinary } from 'cloudinary';
import { Logger } from '@nestjs/common';

const logger = new Logger('CloudinaryConfig');

/**
 * Initialize and validate Cloudinary configuration
 * Reads credentials from environment variables
 */
export function initializeCloudinary(): typeof cloudinary {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Validate required environment variables
  if (!cloudName || !apiKey || !apiSecret) {
    logger.error('Missing required Cloudinary configuration:');
    if (!cloudName) logger.error('  - CLOUDINARY_CLOUD_NAME');
    if (!apiKey) logger.error('  - CLOUDINARY_API_KEY');
    if (!apiSecret) logger.error('  - CLOUDINARY_API_SECRET');
    throw new Error(
      'Cloudinary configuration is incomplete. Please set all required environment variables.',
    );
  }

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  logger.log(
    `✓ Cloudinary initialized for cloud: ${cloudName}`,
  );

  return cloudinary;
}

/**
 * Get configured Cloudinary instance
 * Must call initializeCloudinary() first
 */
export function getCloudinaryInstance(): typeof cloudinary {
  return cloudinary;
}

/**
 * Cloudinary upload options
 */
export interface CloudinaryUploadOptions {
  folder?: string;
  public_id?: string;
  overwrite?: boolean;
  tags?: string[];
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  type?: 'upload' | 'private' | 'authenticated';
  upload_preset?: string | undefined;
  transformation?: any[];
}

/**
 * Build upload options with user context
 */
export function buildUploadOptions(
  userId: string,
  filename: string,
  customOptions?: Partial<CloudinaryUploadOptions>,
): CloudinaryUploadOptions {
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!uploadPreset) {
    logger.warn('CLOUDINARY_UPLOAD_PRESET not configured, uploads may fail');
  }

  const options: CloudinaryUploadOptions = {
    folder: 'logos',
    public_id: `logos/${userId}/company-logo`,
    overwrite: true,
    tags: ['company-logo', userId],
    resource_type: 'image',
    type: 'upload',
    ...customOptions,
  };

  if (uploadPreset) {
    options.upload_preset = uploadPreset;
  }

  return options;
}
