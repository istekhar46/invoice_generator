import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }
    
    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value);
    }
    
    return value;
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
      .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick, onload, etc.
      .trim();
  }

  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.transform(item, {} as ArgumentMetadata));
    }
    
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = this.transform(obj[key], {} as ArgumentMetadata);
      }
    }
    return sanitized;
  }
}