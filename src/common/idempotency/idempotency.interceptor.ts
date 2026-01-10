import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable, EMPTY, tap, catchError } from 'rxjs';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { IdempotencyService } from './idempotency.service';
import { IDEMPOTENCY_OPTIONS_KEY } from './idempotency.decorator';
import { IdempotencyStatus, HttpMethod } from './idempotency.types';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly HEADER = 'idempotency-key';

  constructor(
    private readonly service: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const enabled = this.reflector.get<boolean>(
      IDEMPOTENCY_OPTIONS_KEY,
      context.getHandler(),
    );

    if (!enabled) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const key = req.headers[this.HEADER] as string;
    if (!key) {
      throw new BadRequestException('IDEMPOTENCY_KEY_REQUIRED');
    }

    const hash = this.service.generateRequestHash(
      req.body,
      req.params,
      req.query,
    );

    const record = await this.service.checkOrCreate(
      key,
      hash,
      req.originalUrl,
      req.method as HttpMethod,
      (req as any).user?.userId,
    );

    if (record.status === IdempotencyStatus.COMPLETED) {
      res
        .status(record.responseStatus ?? 200)
        .json(record.responseBody);
      return EMPTY;
    }

    return next.handle().pipe(
      tap(async (data) => {
        await this.service.markSuccess(
          record,
          res.statusCode,
          data,
        );
      }),
      catchError(async (err) => {
        await this.service.markFailure(record);
        throw err;
      }),
    );
  }
}
