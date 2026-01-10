export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum IdempotencyStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}


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
