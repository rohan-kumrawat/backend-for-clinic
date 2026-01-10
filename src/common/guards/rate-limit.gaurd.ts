import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimitStoreService } from '../rate-limit/rate-limit-store.service';
import { IpUtils } from '../utils/ip.utils';
import { RATE_LIMIT_PROFILES, RateLimitConfig } from '../config/rate-limit.config';

export const RATE_LIMIT_CONFIG = 'rateLimitConfig';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitStore: RateLimitStoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const clientIp = IpUtils.normalizeIp(IpUtils.extractClientIp(request));
    const endpoint = request.originalUrl || request.url;
    const method = request.method;

    // Get rate limit configuration for this endpoint
    const config = this.getRateLimitConfig(endpoint, method);
    
    // Check if IP is blocked
    const isBlocked = await this.rateLimitStore.isIpBlocked(clientIp);
    if (isBlocked) {
      const blockUntil = this.rateLimitStore.getBlockedUntil(clientIp);
      throw new ForbiddenException({
        errorCode: 'RATE_LIMIT_BLOCKED',
        message: 'Too many requests',
        retryAfter: blockUntil ? Math.ceil((blockUntil - Date.now()) / 1000) : 300,
      });
    }

    // Apply rate limiting
    const result = await this.rateLimitStore.checkRateLimit(clientIp, config);

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', config.maxRequests);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', Math.ceil(result.reset / 1000));

    if (!result.allowed) {
      response.setHeader('Retry-After', Math.ceil((result.reset - Date.now()) / 1000));
      
      throw new ForbiddenException({
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      });
    }

    return true;
  }

  private getRateLimitConfig(endpoint: string, method: string): RateLimitConfig {
    // Determine profile based on endpoint and method
    if (endpoint.startsWith('/auth/')) {
      return RATE_LIMIT_PROFILES.auth;
    }

    if (method === 'GET' || method === 'HEAD') {
      return RATE_LIMIT_PROFILES.read;
    }

    return RATE_LIMIT_PROFILES.write;
  }
}