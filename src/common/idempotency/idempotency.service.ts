import { Injectable, ServiceUnavailableException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';

export interface IdempotencyRecord {
  key: string;
  hash: string;
  response?: any;
  status?: number;
}

@Injectable()
export class IdempotencyService {
  private readonly store = new Map<string, IdempotencyRecord>();

  generateRequestHash(
    body: any,
    params: Record<string, any> = {},
    query: Record<string, any> = {},
  ): string {
    const data = JSON.stringify({ body, params, query });
    return createHash('sha256').update(data).digest('hex');
  }

  checkRequest(
    key: string,
    hash: string,
  ): { replay: boolean; response?: any; status?: number } {
    const existing = this.store.get(key);

    if (!existing) {
      this.store.set(key, { key, hash });
      return { replay: false };
    }

    if (existing.hash !== hash) {
      throw new ConflictException('IDEMPOTENCY_KEY_CONFLICT');
    }

    if (existing.response) {
      return {
        replay: true,
        response: existing.response,
        status: existing.status,
      };
    }

    throw new ServiceUnavailableException('REQUEST_IN_PROGRESS');
  }

  storeSuccess(key: string, status: number, response: any) {
    const record = this.store.get(key);
    if (!record) return;

    record.response = response;
    record.status = status;
  }

  storeFailure(key: string) {
    this.store.delete(key);
  }
}
