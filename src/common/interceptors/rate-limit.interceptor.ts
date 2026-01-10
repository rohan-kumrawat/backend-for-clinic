import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

import { IpUtils } from '../utils/ip.utils';
import { LoggerService } from '../logger/logger.service';
import { SecurityMetricsService } from '../security/security-metrics.service';
import { RateLimitStoreService } from '../security/rate-limit-store.service';
import { SECURITY_CONFIG } from '../config/security.config';
import { RoleEnum } from '../enums/role.enum';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
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
    const response = context.switchToHttp().getResponse<Response>();

    const clientIp = IpUtils.normalizeIp(
      IpUtils.extractClientIp(request),
    );

    const endpoint = request.originalUrl || request.url;
    const method = request.method;

    const user = request.user as
      | { userId?: string; role?: RoleEnum }
      | undefined;

    const userId = user?.userId;
    const userRole = user?.role;

    // Skip rate limiting for infra endpoints
    if (this.shouldSkipRateLimit(endpoint)) {
      return next.handle();
    }

    const identifier = userId ?? clientIp;
    const type: 'user' | 'ip' = userId ? 'user' : 'ip';
    const key = `${method}:${endpoint}`;

    // Base profile
    const baseProfile = this.getRateLimitProfile(endpoint, userRole);

    // Progressive penalty (read-only, no offense recording here)
    const offenseType = this.getOffenseType(endpoint, method);
    const offenseRecord = offenseType
      ? this.metrics.getOffenseRecord(identifier, offenseType)
      : null;

    const effectiveProfile =
      offenseRecord && offenseRecord.penaltyLevel > 0
        ? await this.rateLimitStore.applyProgressivePenalty(
            identifier,
            key,
            baseProfile,
            offenseRecord.penaltyLevel,
            type,
          )
        : baseProfile;

    // Apply rate limit
    const result = await this.rateLimitStore.checkRateLimit(
      identifier,
      key,
      effectiveProfile,
      type,
    );

    // Headers
    this.setRateLimitHeaders(response, result, effectiveProfile);

    if (!result.allowed) {
      this.metrics.incrementCounter('rate_limit_hits', {
        identifier,
        type,
        endpoint,
        reason: result.reason || 'EXCEEDED',
      });

      await this.auditService.log({
        actorId: userId ?? null,
        actorRole: userRole ?? null,
        action: 'RATE_LIMIT_EXCEEDED',
        entity: 'SECURITY',
        requestData: {
          endpoint,
          method,
          identifier,
          type,
          limit: effectiveProfile.maxRequests,
          windowMs: effectiveProfile.windowMs,
          blockDurationMs: result.blockDuration,
        },
        ipAddress: clientIp,
        userAgent: request.get('user-agent'),
        endpoint,
        method,
        statusCode: 429,
      });

      throw new HttpException({
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(
          (result.resetTime - Date.now()) / 1000,
        ),
      }, 
      HttpStatus.TOO_MANY_REQUESTS);
    }

    return next.handle().pipe(
      tap({
        next: () => {
          response.setHeader(
            'X-RateLimit-Remaining',
            result.remaining,
          );
        },
      }),
    );
  }

  // ----------------- helpers -----------------

  private shouldSkipRateLimit(endpoint: string): boolean {
    const skip = [
      '/health',
      '/internal/metrics',
      '/favicon.ico',
    ];
    return skip.some((p) => endpoint.startsWith(p));
  }

  private getRateLimitProfile(
    endpoint: string,
    role?: RoleEnum,
  ) {
    if (endpoint.endsWith('/auth/login')) {
      return SECURITY_CONFIG.rateLimiting.public.login;
    }

    if (
      endpoint.endsWith('/auth/password-reset/request')
    ) {
      return SECURITY_CONFIG.rateLimiting.public.passwordReset;
    }

    if (role) {
      switch (role) {
        case RoleEnum.ADMIN:
          return SECURITY_CONFIG.rateLimiting.authenticated.admin;
        case RoleEnum.RECEPTIONIST:
          return SECURITY_CONFIG.rateLimiting.authenticated.receptionist;
        default:
          return SECURITY_CONFIG.rateLimiting.authenticated.default;
      }
    }

    return SECURITY_CONFIG.rateLimiting.strict;
  }

  private getOffenseType(
    endpoint: string,
    method: string,
  ): string | null {
    if (
      endpoint.endsWith('/auth/login') &&
      method === 'POST'
    ) {
      return 'failed_login';
    }

    if (
      endpoint.endsWith('/auth/password-reset/request') &&
      method === 'POST'
    ) {
      return 'password_reset_attempt';
    }

    return null;
  }

  private setRateLimitHeaders(
    res: Response,
    result: any,
    profile: any,
  ): void {
    res.setHeader(
      'X-RateLimit-Limit',
      profile.maxRequests,
    );
    res.setHeader(
      'X-RateLimit-Remaining',
      result.remaining,
    );
    res.setHeader(
      'X-RateLimit-Reset',
      Math.ceil(result.resetTime / 1000),
    );

    if (result.blockDuration) {
      res.setHeader(
        'Retry-After',
        Math.ceil(result.blockDuration / 1000),
      );
    }
  }
}
