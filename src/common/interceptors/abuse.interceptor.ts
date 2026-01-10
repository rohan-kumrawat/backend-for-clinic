import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditService } from '../audit/audit.service';
import { RateLimitStoreService } from '../rate-limit/rate-limit-store.service';
import { IpUtils } from '../utils/ip.utils';
import { ABUSE_DETECTION_CONFIG } from '../config/rate-limit.config';

@Injectable()
export class AbuseDetectionInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly rateLimitStore: RateLimitStoreService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const endpoint = request.originalUrl || request.url;

    // Only apply to sensitive endpoints
    if (!this.isSensitiveEndpoint(endpoint)) {
      return next.handle();
    }

    const clientIp = IpUtils.normalizeIp(IpUtils.extractClientIp(request));
    const user = request.user as { userId?: string; username?: string; role?: string } | undefined;
    const username = request.body?.username || user?.username;

    return next.handle().pipe(
      tap({
        next: async () => {
          // Successful request - reset counters for this IP/username
          if (endpoint.endsWith('/auth/login') && username) {
            // Clear abuse tracking on successful login
            await this.rateLimitStore.trackAuthAttempt(clientIp, username, {
              ...ABUSE_DETECTION_CONFIG,
              MAX_ATTEMPTS_PER_IP: 0,
              MAX_ATTEMPTS_PER_USERNAME: 0,
            });
          }
        },
        error: async (error) => {
          // Failed request - track for abuse
          if (this.shouldTrackError(error)) {
            await this.handleFailedAttempt(endpoint, clientIp, username, error);
          }
        },
      }),
    );
  }

  private isSensitiveEndpoint(endpoint: string): boolean {
    const sensitiveEndpoints = [
      '/auth/login',
      '/auth/password-reset/request',
      '/auth/password-reset/confirm',
    ];
    return sensitiveEndpoints.some(ep => endpoint.startsWith(ep));
  }

  private shouldTrackError(error: any): boolean {
    const statusCode = error.status || error.statusCode;
    return [401, 403, 422].includes(statusCode); // Unauthorized, Forbidden, Unprocessable Entity
  }

  private async handleFailedAttempt(
    endpoint: string,
    ip: string,
    username: string,
    error: any,
  ): Promise<void> {
    try {
      // Track attempt
      const result = await this.rateLimitStore.trackAuthAttempt(
        ip,
        username || 'unknown',
        ABUSE_DETECTION_CONFIG,
      );

      // Log to audit
      await this.auditService.log({
        actorId: null,
        actorRole: null,
        action: 'AUTH_ATTEMPT_FAILED',
        entity: 'USER',
        requestData: { endpoint, username: username ? '[REDACTED]' : null },
        ipAddress: ip,
        endpoint,
        method: 'POST',
        statusCode: error.status || 500,
        errorMessage: error.message,
      });

      if (!result.allowed) {
        // Block the IP
        if (result.blockUntil) {
          await this.rateLimitStore.blockIp(ip, result.blockUntil - Date.now());
          
          await this.auditService.log({
            actorId: null,
            actorRole: null,
            action: 'ABUSE_DETECTED',
            entity: 'USER',
            requestData: { 
              endpoint, 
              username: username ? '[REDACTED]' : null,
              reason: 'Multiple IPs targeting same account',
            },
            ipAddress: ip,
            endpoint,
            method: 'POST',
            statusCode: 403,
          });

          throw new ForbiddenException({
            errorCode: 'ACCOUNT_TEMPORARILY_LOCKED',
            message: 'Account locked due to suspicious activity',
            retryAfter: Math.ceil((result.blockUntil - Date.now()) / 1000),
          });
        } else {
          await this.auditService.log({
            actorId: null,
            actorRole: null,
            action: 'RATE_LIMIT_BLOCKED',
            entity: 'IP',
            entityId: ip,
            requestData: { endpoint },
            ipAddress: ip,
            endpoint,
            method: 'POST',
            statusCode: 429,
          });

          throw new ForbiddenException({
            errorCode: 'TOO_MANY_ATTEMPTS',
            message: 'Too many failed attempts',
            retryAfter: 300, // 5 minutes
          });
        }
      }
    } catch (auditError) {
      // Never throw from error handler
      console.error('Failed to log abuse detection:', auditError);
    }
  }
}