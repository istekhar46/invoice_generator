import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  details?: any;
  validationErrors?: ValidationError[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let details: any;
    let validationErrors: ValidationError[] | undefined;

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message ?? exception.message;
        details = (exceptionResponse as any).details;

        // Handle validation errors from class-validator
        if (status === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
          validationErrors = this.extractValidationErrors(message);
          message = 'Validation failed';
        }
      }
    }
    // Handle Prisma errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      message = prismaError.message;
      details = prismaError.details;
    }
    // Handle Prisma validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      details = { error: 'Validation failed' };
    }
    // Handle Prisma initialization errors
    else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Database connection failed';
      this.logger.error('Database initialization error', exception);
    }
    // Handle unknown errors
    else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error('Unhandled exception', exception.stack);
    }

    const errorResponse: ApiErrorResponse = {
      statusCode: status,
      message,
      error: this.getErrorName(status),
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details && { details }),
      ...(validationErrors && validationErrors.length > 0 && { validationErrors }),
    };

    // Log error for monitoring
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${status}: ${JSON.stringify(message)}`);
    }

    response.status(status).json(errorResponse);
  }

  private handlePrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    details?: any;
  } {
    switch (exception.code) {
      case 'P2002':
        // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          details: {
            field: exception.meta?.target,
          },
        };
      case 'P2025':
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
        };
      case 'P2003':
        // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to related record',
          details: {
            field: exception.meta?.field_name,
          },
        };
      case 'P2014':
        // Required relation violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Required relation is missing',
        };
      case 'P2021':
        // Table does not exist
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database schema error',
        };
      case 'P2024':
        // Connection timeout
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database connection timeout',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          details: {
            code: exception.code,
          },
        };
    }
  }

  private getErrorName(status: number): string {
    return HttpStatus[status] ?? 'Unknown Error';
  }

  private extractValidationErrors(messages: string[]): ValidationError[] {
    const validationErrors: ValidationError[] = [];

    for (const msg of messages) {
      // Parse validation error messages from class-validator
      // Format is typically: "field message" or "nested.field message"
      const parts = msg.split(' ');
      if (parts.length >= 2) {
        const field = parts[0];
        const message = parts.slice(1).join(' ');
        validationErrors.push({ field, message });
      } else {
        // If we can't parse it, add it as a general error
        validationErrors.push({ field: 'unknown', message: msg });
      }
    }

    return validationErrors;
  }
}
