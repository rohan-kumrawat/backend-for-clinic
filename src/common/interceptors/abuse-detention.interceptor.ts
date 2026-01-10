import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

import { IpUtils } from '../utils/ip.utils';
import { LoggerService } from '../logger/logger.service';
import { SecurityMetricsService } from '../security/security-metrics.service';
import { RateLimitStoreService } from '../security/rate-limit-store.service';
import { SECURITY_CONFIG } from '../config/security.config';
import { AuditService } from '../audit/audit.service';
import { RoleEnum } from '../enums/role.enum';

interface RequestTrack {
  timestamp: number;
  endpoint: string;
  method: string;
}

@Injectable()
export class AbuseDetectionInterceptor implements NestInterceptor {
  private readonly rapidRequestStore = new Map<string, RequestTrack[]>();

  constructor(
    private readonly logger: LoggerService,
    private readonly metrics: SecurityMetricsService,
    private readonly rateLimitStore: RateLimitStoreService,
    private readonly auditService: AuditService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    const clientIp = IpUtils.normalizeIp(IpUtils.extractClientIp(request));
    const endpoint = request.originalUrl || request.url;
    const method = request.method;

    const user = request.user as
      | { userId?: string; role?: RoleEnum }
      | undefined;

    const userId: string | null = user?.userId ?? null;
    const userRole: RoleEnum | null = user?.role ?? null;

    if (this.shouldSkipAbuseDetection(endpoint)) {
      return next.handle();
    }

    await this.detectRapidRequests(
      clientIp,
      userId,
      userRole,
      endpoint,
      method,
      request,
    );

    await this.monitorSensitiveEndpoints(
      endpoint,
      method,
      clientIp,
      userId,
    );

    return next.handle().pipe(
      tap({
        error: async (error) => {
          await this.handleFailedRequest(
            error,
            endpoint,
            method,
            clientIp,
            userId,
            userRole,
            request,
          );
        },
      }),
    );
  }

  // ------------------------------------------------------------------

  private async detectRapidRequests(
    ip: string,
    userId: string | null,
    userRole: RoleEnum | null,
    endpoint: string,
    method: string,
    request: Request,
  ): Promise<void> {
    const identifier = userId ?? ip;
    const type: 'user' | 'ip' = userId ? 'user' : 'ip';

    const now = Date.now();
    let tracks = this.rapidRequestStore.get(identifier) || [];

    tracks = tracks.filter(
      t => now - t.timestamp <
        SECURITY_CONFIG.abuseDetection.rapidRequestWindowMs,
    );

    tracks.push({ timestamp: now, endpoint, method });

    if (tracks.length === 0) {
      this.rapidRequestStore.delete(identifier);
    } else {
      this.rapidRequestStore.set(identifier, tracks);
    }

    if (
      tracks.length <
      SECURITY_CONFIG.abuseDetection.rapidRequestThreshold
    ) {
      return;
    }

    const offenseRecord = this.metrics.recordOffense(
      identifier,
      'rapid_requests',
    );

    this.metrics.incrementCounter('auth_abuse_detected', {
      identifier,
      type,
      endpoint,
      count: tracks.length.toString(),
    });

    if (offenseRecord.penaltyLevel < 2) {
      this.logger.warn('Rapid request pattern detected', {
        identifier,
        type,
        endpoint,
        count: tracks.length,
        penaltyLevel: offenseRecord.penaltyLevel,
      });
      return;
    }

    const blockDuration =
      SECURITY_CONFIG.abuseDetection.temporaryBlockDurationMs;

    this.rateLimitStore.blockIdentifier(
      identifier,
      blockDuration,
      type,
      'Rapid request abuse',
    );

    this.metrics.incrementCounter(
      type === 'ip' ? 'ip_blocked' : 'user_blocked',
    );

    await this.auditService.log({
      actorId: userId,
      actorRole: userRole,
      action: 'ABUSE_RAPID_REQUESTS',
      entity: 'SECURITY',
      requestData: {
        endpoint,
        method,
        identifier,
        type,
        count: tracks.length.toString(),
        blockDuration,
      },
      ipAddress: ip,
      userAgent: request.get('user-agent') || undefined,
      endpoint,
      method,
      statusCode: 403,
    });

    throw new HttpException(
      {
        errorCode: 'ABUSE_DETECTED',
        message: 'Suspicious activity detected. Access temporarily blocked.',
        retryAfter: Math.ceil(blockDuration / 1000),
      },
      HttpStatus.FORBIDDEN,
    );
  }

  // ------------------------------------------------------------------

  private async monitorSensitiveEndpoints(
    endpoint: string,
    method: string,
    ip: string,
    userId: string | null,
  ): Promise<void> {
    if (
      !endpoint.includes('/auth/password-reset/request') ||
      method !== 'POST'
    ) {
      return;
    }

    const identifier = userId ?? ip;
    const type: 'user' | 'ip' = userId ? 'user' : 'ip';

    this.metrics.incrementCounter('password_reset_attempts');

    const offenseRecord = this.metrics.recordOffense(
      identifier,
      'password_reset_attempt',
    );

    if (
      offenseRecord.count <
      SECURITY_CONFIG.abuseDetection.maxPasswordResets
    ) {
      return;
    }

    if (offenseRecord.penaltyLevel < 2) {
      return;
    }

    const blockDuration =
      SECURITY_CONFIG.abuseDetection.temporaryBlockDurationMs;

    this.rateLimitStore.blockIdentifier(
      identifier,
      blockDuration,
      type,
      'Excessive password reset attempts',
    );

    this.metrics.incrementCounter(
      type === 'ip' ? 'ip_blocked' : 'user_blocked',
    );
  }

  // ------------------------------------------------------------------

  private async handleFailedRequest(
    error: any,
    endpoint: string,
    method: string,
    ip: string,
    userId: string | null,
    userRole: RoleEnum | null,
    request: Request,
  ): Promise<void> {
    const statusCode = error?.status ?? error?.statusCode;
    if (!statusCode || statusCode < 400) return;

    const identifier = userId ?? ip;
    const type: 'user' | 'ip' = userId ? 'user' : 'ip';

    const failureRecord = this.metrics.recordOffense(
      identifier,
      'consecutive_failures',
    );

    if (failureRecord.count < 10 || failureRecord.penaltyLevel < 2) {
      return;
    }

    const blockDuration =
      SECURITY_CONFIG.abuseDetection.temporaryBlockDurationMs;

    this.rateLimitStore.blockIdentifier(
      identifier,
      blockDuration,
      type,
      'Excessive consecutive failures',
    );

    this.metrics.incrementCounter(
      type === 'ip' ? 'ip_blocked' : 'user_blocked',
    );

    await this.auditService.log({
      actorId: userId,
      actorRole: userRole,
      action: 'EXCESSIVE_FAILURES',
      entity: 'SECURITY',
      requestData: {
        endpoint,
        method,
        identifier,
        type,
        failures: failureRecord.count.toString(),
        blockDuration,
      },
      ipAddress: ip,
      userAgent: request.get('user-agent') || undefined,
      endpoint,
      method,
      statusCode: 403,
    });
  }

  // ------------------------------------------------------------------

  private shouldSkipAbuseDetection(endpoint: string): boolean {
    return (
      endpoint.startsWith('/api/v1/health') ||
      endpoint.startsWith('/api/v1/internal/metrics') ||
      endpoint.startsWith('/favicon.ico')
    );
  }
}
