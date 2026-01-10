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

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly HEADER = 'idempotency-key';

  constructor(
    private readonly service: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
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

    const check = this.service.checkRequest(key, hash);

    // ✅ DUPLICATE REQUEST → RETURN CACHED RESPONSE & TERMINATE STREAM
    if (check.replay) {
      res.status(check.status || 200).json(check.response);
      return EMPTY; // 🔥 THIS IS THE FIX
    }

    // ✅ FIRST REQUEST → ALLOW EXECUTION
    return next.handle().pipe(
      tap((data) => {
        this.service.storeSuccess(key, res.statusCode, data);
      }),
      catchError((err) => {
        this.service.storeFailure(key);
        throw err;
      }),
    );
  }
}
