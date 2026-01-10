import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { RoleEnum } from '../enums/role.enum';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as { userId: string; role: RoleEnum } | undefined;

    if (!user) return next.handle();

    const endpoint = req.originalUrl;
    const method = req.method;

    return next.handle().pipe(
      tap({
        next: (response) => {
          this.audit.log({
            actorId: user.userId,
            actorRole: user.role,
            action: method,
            entity: this.extractEntity(endpoint),
            entityId: this.extractEntityId(req) ?? undefined,
            requestData: req.body ?? null,
            responseData: response ?? null,
            ipAddress: req.ip ?? undefined,
            userAgent: req.get('user-agent') ?? undefined,
            endpoint,
            method,
            statusCode: 200,
          });
        },
        error: (err) => {
          this.audit.log({
            actorId: user.userId,
            actorRole: user.role,
            action: method,
            entity: this.extractEntity(endpoint),
            entityId: this.extractEntityId(req) ?? undefined,
            requestData: req.body ?? null,
            ipAddress: req.ip ?? undefined,
            userAgent: req.get('user-agent') ?? undefined,
            endpoint,
            method,
            statusCode: err?.status ?? 500,
            errorMessage: err?.message,
          });
        },
      }),
    );
  }

  private extractEntity(url: string): string {
    const match = url.split('/').find((s) =>
      ['patients', 'packages', 'payments', 'sessions', 'users', 'doctors'].includes(s),
    );
    return match?.toUpperCase() ?? 'UNKNOWN';
  }

  private extractEntityId(req: Request): string | null {
    return (
      req.params?.id ??
      req.params?.patientId ??
      req.params?.packageId ??
      req.params?.paymentId ??
      null
    );
  }
}
