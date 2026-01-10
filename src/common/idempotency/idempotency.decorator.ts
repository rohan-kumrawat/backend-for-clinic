import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor';

export const IDEMPOTENCY_OPTIONS_KEY = 'IDEMPOTENCY_OPTIONS_KEY';

export const Idempotent = () =>
  applyDecorators(
    SetMetadata(IDEMPOTENCY_OPTIONS_KEY, true),
    UseInterceptors(IdempotencyInterceptor),
  );
