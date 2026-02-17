import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') ?? '';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`${method} ${url} - ${ip} - ${userAgent}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const contentLength = response.get('content-length') ?? '0';
          const responseTime = Date.now() - startTime;

          this.logger.log(
            `${method} ${url} - ${statusCode} - ${contentLength}b - ${responseTime}ms`,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error?.status ?? 500;

          this.logger.error(
            `${method} ${url} - ${statusCode} - ${responseTime}ms - Error: ${error?.message ?? 'Unknown error'}`,
          );
        },
      }),
    );
  }
}
