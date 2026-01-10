export type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type IdempotencyStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'conflict';

export interface IdempotencyOptions {
  ttlHours?: number;
  lockTimeoutMs?: number;
  enforceForUsers?: boolean;
  methods?: HttpMethod[];
}

export interface IdempotencyRequest {
  idempotencyKey: string;
  userId?: string;
  endpoint: string;
  method: HttpMethod;
  requestHash: string;
  requestParams?: Record<string, any>;
  requestBody?: any;
}

export interface IdempotencyResult {
  shouldProcess: boolean;
  existingResponse?: {
    status: number;
    body: any;
    headers?: Record<string, string>;
  };
  conflict?: {
    message: string;
    existingHash: string;
    currentHash: string;
  };
}
