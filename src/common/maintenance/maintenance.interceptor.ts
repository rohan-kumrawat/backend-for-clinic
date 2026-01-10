import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MaintenanceService } from './maintenance.service';

@Injectable()
export class MaintenanceInterceptor implements NestInterceptor {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const path = req.originalUrl || req.url;

    if (this.maintenanceService.isEnabled()) {
      if (!this.maintenanceService.shouldBypass(path)) {
        this.maintenanceService.recordHit(path);

        throw new ServiceUnavailableException({
          errorCode: 'MAINTENANCE_MODE',
          message: this.maintenanceService.status().message,
          retryAfter: 600,
        });
      }
    }

    return next.handle();
  }
}
