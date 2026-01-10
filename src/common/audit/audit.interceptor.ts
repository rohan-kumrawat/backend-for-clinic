import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditService } from './audit.service';
import { RoleEnum } from '../enums/role.enum';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const user = request.user as { userId: string; role: RoleEnum } | undefined;
    const method = request.method;
    const endpoint = request.originalUrl;

    // Skip audit for GET requests (except those that mutate data)
    const shouldSkip = method === 'GET' && !this.isMutationEndpoint(endpoint);
    if (shouldSkip || !user) {
      return next.handle();
    }

    const entity = this.extractEntityFromEndpoint(endpoint);
    const action = this.determineAction(method, endpoint);

    const requestData = this.extractRequestData(request);
    const entityId = this.extractEntityId(request);

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          // Log successful operation
          this.auditService.log({
            actorId: user.userId,
            actorRole: user.role,
            action,
            entity,
            entityId,
            requestData: requestData ?? undefined,
            responseData: this.sanitizeResponse(responseData) ?? undefined,
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
            endpoint,
            method,
            statusCode: response.statusCode,
          });
        },
        error: (error:unknown) => {
          const err = error as any;
          // Log failed operation
          this.auditService.log({
            actorId: user.userId,
            actorRole: user.role,
            action,
            entity,
            entityId,
            requestData: requestData ?? undefined,
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
            endpoint,
            method,
            errorMessage: err.message,
            statusCode: err.status || 500,
          });
        },
      }),
    );
  }

  private isMutationEndpoint(endpoint: string): boolean {
    const mutationEndpoints = [
      '/patients/activate',
      '/patients/deactivate',
      '/packages/close-early',
      '/packages/complete',
    ];
    return mutationEndpoints.some((mutation) => endpoint.includes(mutation));
  }

  private extractEntityFromEndpoint(endpoint: string): string {
    const segments = endpoint.split('/');
    for (let i = 0; i < segments.length; i++) {
      if (['patients', 'doctors', 'packages', 'payments', 'sessions', 'users'].includes(segments[i])) {
        return segments[i].toUpperCase();
      }
    }
    return 'UNKNOWN';
  }

  private determineAction(method: string, endpoint: string): string {
    const methodActions: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    if (endpoint.includes('/activate')) return 'ACTIVATE';
    if (endpoint.includes('/deactivate')) return 'DEACTIVATE';
    if (endpoint.includes('/close-early')) return 'CLOSE_EARLY';
    if (endpoint.includes('/complete')) return 'COMPLETE';

    return methodActions[method] || method;
  }

  private extractRequestData(request: Request): Record<string, any> | null {
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return request.body || null;
    }
    if (request.method === 'DELETE') {
      return { params: request.params, query: request.query };
    }
    return null;
  }

  private extractEntityId(request: Request): string | undefined {
    return request.params.id || request.params.patientId || 
           request.params.packageId || request.params.paymentId || 
           request.params.doctorId || request.params.userId;
  }

  private sanitizeResponse(data: any): Record<string, any> | null {
    if (!data) return null;
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      // Remove potentially large data from response logging
      delete sanitized.data?.rows;
      delete sanitized.data?.items;
      delete sanitized.content;
      delete sanitized.buffer;
      return sanitized;
    }
    
    return { message: 'Response sanitized' };
  }
}