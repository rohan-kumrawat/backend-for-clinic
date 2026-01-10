import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '../metrics/metrics.service';
import { AuditService } from '../audit/audit.service';
import { RoleEnum } from '../enums/role.enum';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
    private readonly logger = new Logger(PerformanceInterceptor.name);
    private readonly SLOW_REQUEST_THRESHOLD = 500;

    constructor(
        private readonly metricsService: MetricsService,
        private readonly auditService: AuditService,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const startTime = Date.now();
        const endpoint = request.originalUrl || request.url;
        const method = request.method;

        const ip =
            request.ip ??
            request.headers['x-forwarded-for']?.toString().split(',')[0] ??
            'unknown';

        const user = request.user as
            | { userId?: string; role?: RoleEnum }
            | undefined;

        const userId = user?.userId;
        const userRole = user?.role;

        return next.handle().pipe(
            tap({
                next: () => {
                    this.metricsService.incTotal();
                },
                error: (error) => {
                    this.metricsService.incTotal();
                    this.metricsService.incFailed();

                    const status = error?.status ?? error?.statusCode;
                    if (status === 401 || status === 403) {
                        this.metricsService.incAuthFail();
                    }
                },
            }),
        );
    }
}