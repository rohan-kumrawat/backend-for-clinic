import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
// import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
// import { OBSERVABILITY_CONFIG } from '../config/observability.config';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();

    const start = Date.now();
    const requestId = (req as any).id;

    this.logger.info('HTTP_REQUEST_START', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      userId: (req as any).user?.userId,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info('HTTP_REQUEST_END', {
            requestId,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
          });
        },
        error: (err) => {
          this.logger.error('HTTP_REQUEST_ERROR', {
            requestId,
            message: err?.message,
            durationMs: Date.now() - start,
          });
        },
      }),
    );
  }
}
