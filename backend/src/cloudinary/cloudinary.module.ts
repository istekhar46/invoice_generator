import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

/**
 * CloudinaryModule provides cloud-based image storage functionality
 * Uses Cloudinary API for uploading, storing, and managing image files
 */
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
