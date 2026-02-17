import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { SANITIZE_KEY } from '../decorators/sanitize.decorator';

@Injectable()
export class SanitizationInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const shouldSanitize = this.reflector.getAllAndOverride<boolean>(SANITIZE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (shouldSanitize) {
      const request = context.switchToHttp().getRequest();
      if (request.body) {
        request.body = this.sanitizeInput(request.body);
      }
      if (request.query) {
        request.query = this.sanitizeInput(request.query);
      }
      if (request.params) {
        request.params = this.sanitizeInput(request.params);
      }
    }

    return next.handle();
  }

  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      // Don't sanitize Date objects, just return them as-is
      if (input instanceof Date) {
        return input;
      }

      const sanitized: any = {};
      for (const key in input) {
        if (input.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeInput(input[key]);
        }
      }
      return sanitized;
    }

    return input;
  }

  private sanitizeString(str: string): string {
    // Remove potentially dangerous HTML tags and scripts
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/data:/gi, '') // Remove data: protocol (can be dangerous)
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers with quotes
      .replace(/on\w+\s*=\s*[^>\s]+/gi, '') // Remove event handlers without quotes
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }
}
