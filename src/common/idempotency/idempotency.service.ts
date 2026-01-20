import {
  Injectable,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import stringify from 'json-stable-stringify';
import { IdempotencyKey } from './idempotency.entity';
import { IdempotencyStatus, HttpMethod } from './idempotency.types';
import stableStringify from 'json-stable-stringify';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly repo: Repository<IdempotencyKey>,
  ) { }

  generateRequestHash(
    body: any,
    params: Record<string, any> = {},
    query: Record<string, any> = {},
  ): string {
    return createHash('sha256')
      .update(stringify({ body, params, query }) || '')
      .digest('hex');
  }

  async checkOrCreate(
    key: string,
    hash: string,
    endpoint: string,
    method: HttpMethod,
    userId?: string,
  ): Promise<IdempotencyKey> {
    const existing = await this.repo.findOne({
      where: { idempotencyKey: key, method, endpoint },
    });

    if (!existing) {
      const record = this.repo.create({
        idempotencyKey: key,
        requestHash: hash,
        endpoint,
        method,
        userId: userId ?? null,
        status: IdempotencyStatus.PENDING,
      });

      return this.repo.save(record);
    }

    if (existing.requestHash !== hash) {
      throw new ConflictException('IDEMPOTENCY_KEY_CONFLICT');
    }

    if (existing.status === IdempotencyStatus.COMPLETED) {
      return existing;
    }

    throw new ServiceUnavailableException('REQUEST_IN_PROGRESS');
  }

  async markSuccess(
    record: IdempotencyKey,
    statusCode: number,
    responseBody: any,
  ): Promise<void> {
    record.status = IdempotencyStatus.COMPLETED;
    record.responseStatus = statusCode;
    record.responseBody = responseBody;
    record.completedAt = new Date();

    await this.repo.save(record);
  }

  async markFailure(record: IdempotencyKey): Promise<void> {
    record.status = IdempotencyStatus.FAILED;
    await this.repo.save(record);
  }
}
