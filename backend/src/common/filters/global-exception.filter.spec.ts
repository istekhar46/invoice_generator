import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter, ApiErrorResponse } from './global-exception.filter';
import { Prisma } from '@prisma/client';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HTTP Exception handling', () => {
    it('should handle HttpException correctly', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Test error',
          error: 'BAD_REQUEST',
          timestamp: expect.any(String),
          path: '/api/test',
        }),
      );
    });

    it('should handle HttpException with object response', () => {
      const exceptionResponse = {
        message: ['Field is required', 'Invalid format'],
        details: { field: 'email' },
      };
      const exception = new HttpException(exceptionResponse, HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: ['Field is required', 'Invalid format'],
          error: 'BAD_REQUEST',
          timestamp: expect.any(String),
          path: '/api/test',
          details: { field: 'email' },
        }),
      );
    });
  });

  describe('Prisma Exception handling', () => {
    it('should handle unique constraint violation (P2002)', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: { target: ['email'] },
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          error: 'CONFLICT',
          timestamp: expect.any(String),
          path: '/api/test',
          details: { field: ['email'] },
        }),
      );
    });

    it('should handle record not found (P2025)', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0',
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'NOT_FOUND',
          timestamp: expect.any(String),
          path: '/api/test',
        }),
      );
    });

    it('should handle validation errors', () => {
      const exception = new Prisma.PrismaClientValidationError(
        'Invalid data provided',
        { clientVersion: '4.0.0' },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid data provided',
          error: 'BAD_REQUEST',
          timestamp: expect.any(String),
          path: '/api/test',
          details: { error: 'Validation failed' },
        }),
      );
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic Error', () => {
      const exception = new Error('Generic error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Generic error',
          error: 'INTERNAL_SERVER_ERROR',
          timestamp: expect.any(String),
          path: '/api/test',
        }),
      );
    });

    it('should handle unknown exceptions', () => {
      const exception = 'Unknown error';

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'INTERNAL_SERVER_ERROR',
          timestamp: expect.any(String),
          path: '/api/test',
        }),
      );
    });
  });
});