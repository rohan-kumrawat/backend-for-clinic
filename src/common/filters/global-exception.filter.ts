import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    // ✅ PREVENT DOUBLE RESPONSE
    if (res.headersSent) {
      return;
    }

    const requestId = (req as any).id;
    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse() as any;
      message = r?.message || exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error('UNHANDLED_EXCEPTION', {
      requestId,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    res.status(status).json({
      errorCode: 'INTERNAL_ERROR',
      message,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
