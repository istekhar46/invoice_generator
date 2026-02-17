import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { v2 as cloudinary } from 'cloudinary';

// Mock Cloudinary module
jest.mock('cloudinary');

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let mockUploadStream: any;

  const mockFile: Express.Multer.File = {
    fieldname: 'logo',
    originalname: 'company-logo.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024 * 100, // 100KB
    buffer: Buffer.from('fake-image-data'),
    destination: '',
    filename: 'logo.png',
    path: '/tmp/logo.png',
    stream: {} as any,
  };

  const mockCloudinaryResponse = {
    public_id: 'logos/user123/company-logo',
    secure_url:
      'https://res.cloudinary.com/test/image/upload/v1234567890/logos/user123/company-logo.png',
    url: 'http://res.cloudinary.com/test/image/upload/v1234567890/logos/user123/company-logo.png',
    format: 'png',
    width: 200,
    height: 200,
  };

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock the upload_stream method
    mockUploadStream = {
      end: jest.fn(),
    };

    (cloudinary.uploader.upload_stream as jest.Mock).mockReturnValue(mockUploadStream);
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudinaryService],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  describe('uploadLogoFile', () => {
    it('should successfully upload a logo file', async () => {
      // Setup: make upload_stream call the success callback
      mockUploadStream.end.mockImplementation(function (buffer: any) {
        const callback = (cloudinary.uploader.upload_stream as jest.Mock).mock.results[0].value;
        // Simulate successful upload callback
        setTimeout(() => {
          callback(null, mockCloudinaryResponse);
        }, 0);
      });

      const result = await service.uploadLogoFile(mockFile, 'user123');

      expect(result).toBe(mockCloudinaryResponse.secure_url);
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'logos',
          public_id: expect.stringContaining('user123'),
          overwrite: true,
          tags: expect.arrayContaining(['company-logo', 'user123']),
        }),
        expect.any(Function),
      );
    });

    it('should throw BadRequestException for invalid MIME type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };

      await expect(service.uploadLogoFile(invalidFile, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for oversized file', async () => {
      const largFile = { ...mockFile, size: 10 * 1024 * 1024 }; // 10MB

      await expect(service.uploadLogoFile(largFile, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing file buffer', async () => {
      const emptyFile = { ...mockFile, buffer: undefined };

      await expect(service.uploadLogoFile(emptyFile as any, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException when upload stream fails', async () => {
      mockUploadStream.end.mockImplementation(function (buffer: any) {
        const callback = (cloudinary.uploader.upload_stream as jest.Mock).mock.results[0].value;
        // Simulate upload error
        setTimeout(() => {
          callback(new Error('Network error'), null);
        }, 0);
      });

      await expect(service.uploadLogoFile(mockFile, 'user123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException when no URL in response', async () => {
      mockUploadStream.end.mockImplementation(function (buffer: any) {
        const callback = (cloudinary.uploader.upload_stream as jest.Mock).mock.results[0].value;
        // Simulate response without URL
        setTimeout(() => {
          callback(null, { public_id: 'test', secure_url: undefined });
        }, 0);
      });

      await expect(service.uploadLogoFile(mockFile, 'user123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle Cloudinary API Key error', async () => {
      mockUploadStream.end.mockImplementation(function (buffer: any) {
        const callback = (cloudinary.uploader.upload_stream as jest.Mock).mock.results[0].value;
        setTimeout(() => {
          callback(new Error('Invalid API Key'), null);
        }, 0);
      });

      await expect(service.uploadLogoFile(mockFile, 'user123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle rate limit error', async () => {
      mockUploadStream.end.mockImplementation(function (buffer: any) {
        const callback = (cloudinary.uploader.upload_stream as jest.Mock).mock.results[0].value;
        setTimeout(() => {
          callback(new Error('rate limit exceeded'), null);
        }, 0);
      });

      await expect(service.uploadLogoFile(mockFile, 'user123')).rejects.toThrow(
        'temporarily unavailable',
      );
    });
  });

  describe('deleteLogoFile', () => {
    it('should successfully delete a logo file from Cloudinary', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

      await service.deleteLogoFile(mockCloudinaryResponse.secure_url, 'user123');

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        expect.stringContaining('logos/user123'),
      );
    });

    it('should handle gracefully when file not found', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'not found' });

      // Should not throw
      await expect(
        service.deleteLogoFile(mockCloudinaryResponse.secure_url, 'user123'),
      ).resolves.not.toThrow();
    });

    it('should return early for empty URL', async () => {
      await service.deleteLogoFile('', 'user123');

      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });

    it('should return early for non-Cloudinary URLs', async () => {
      const localUrl = '/uploads/logos/file.png';

      await service.deleteLogoFile(localUrl, 'user123');

      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });

    it('should not throw on deletion error', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(new Error('Deletion failed'));

      // Should not throw
      await expect(
        service.deleteLogoFile(mockCloudinaryResponse.secure_url, 'user123'),
      ).resolves.not.toThrow();
    });
  });

  describe('getOptimizedLogoUrl', () => {
    it('should generate optimized URL with transformations', () => {
      const optimizedUrl = service.getOptimizedLogoUrl(mockCloudinaryResponse.secure_url, {
        width: 150,
        height: 150,
        quality: 90,
      });

      expect(optimizedUrl).toContain('w_150');
      expect(optimizedUrl).toContain('h_150');
      expect(optimizedUrl).toContain('q_90');
    });

    it('should use default dimensions', () => {
      const optimizedUrl = service.getOptimizedLogoUrl(mockCloudinaryResponse.secure_url);

      expect(optimizedUrl).toContain('w_200');
      expect(optimizedUrl).toContain('h_200');
      expect(optimizedUrl).toContain('q_80');
    });

    it('should return original URL for non-Cloudinary URLs', () => {
      const localUrl = '/uploads/logos/file.png';

      const result = service.getOptimizedLogoUrl(localUrl);

      expect(result).toBe(localUrl);
    });

    it('should return empty string for empty URL', () => {
      const result = service.getOptimizedLogoUrl('');

      expect(result).toBe('');
    });

    it('should handle malformed URLs gracefully', () => {
      const malformedUrl = 'https://invalid-url.com';

      const result = service.getOptimizedLogoUrl(malformedUrl);

      expect(result).toBe(malformedUrl);
    });
  });

  describe('Supported file types', () => {
    ['image/jpeg', 'image/png', 'image/gif'].forEach((mimeType) => {
      it(`should accept ${mimeType} files`, async () => {
        const file = { ...mockFile, mimetype: mimeType };

        mockUploadStream.end.mockImplementation(function (buffer: any) {
          const callback = (cloudinary.uploader.upload_stream as jest.Mock).mock.results[0].value;
          setTimeout(() => {
            callback(null, mockCloudinaryResponse);
          }, 0);
        });

        await expect(service.uploadLogoFile(file, 'user123')).resolves.toBeDefined();
      });
    });
  });

  describe('File size limits', () => {
    it('should accept file at exactly 5MB limit', async () => {
      const file = { ...mockFile, size: 5 * 1024 * 1024 };

      mockUploadStream.end.mockImplementation(function (buffer: any) {
        const callback = (cloudinary.uploader.upload_stream as jest.Mock).mock.results[0].value;
        setTimeout(() => {
          callback(null, mockCloudinaryResponse);
        }, 0);
      });

      await expect(service.uploadLogoFile(file, 'user123')).resolves.toBeDefined();
    });

    it('should reject file just over 5MB limit', async () => {
      const file = { ...mockFile, size: 5 * 1024 * 1024 + 1 };

      await expect(service.uploadLogoFile(file, 'user123')).rejects.toThrow(BadRequestException);
    });
  });
});
