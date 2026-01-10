import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { BACKUP_CONFIG } from '../config/backup.config';

export const READ_ONLY_KEY = 'readOnly';

@Injectable()
export class ReadOnlyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const endpoint = request.originalUrl || request.url;

    // Skip read-only check for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Skip read-only check for backup/restore endpoints (they need to work in read-only mode)
    if (endpoint.startsWith('/api/v1/backup')) {
      return true;
    }

    // Check if system is in read-only mode
    if (BACKUP_CONFIG.appReadOnly) {
      throw new ForbiddenException({
        errorCode: 'SYSTEM_READ_ONLY',
        message: 'System is in read-only mode. Write operations are temporarily disabled.',
      });
    }

    return true;
  }
}