import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { LoggerService } from '../logger/logger.service';
import { RoleEnum } from '../enums/role.enum';

export const MAINTENANCE_BYPASS_PATHS = [
  '/api/v1/health',
  '/api/v1/internal',
];

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  private enabled = false;
  private enabledAt: Date | null = null;
  private enabledBy: string | null = null;
  private message = 'System under maintenance';
  private hits = new Map<string, number>();

  constructor(
    private readonly auditService: AuditService,
    private readonly loggerService: LoggerService,
  ) {}

  async enable(userId: string, userRole: string, message?: string) {
    if (this.enabled) {
      throw new Error('MAINTENANCE_ALREADY_ENABLED');
    }

    this.enabled = true;
    this.enabledAt = new Date();
    this.enabledBy = userId;
    this.message = message || this.message;
    this.hits.clear();

    await this.auditService.log({
      actorId: userId,
      actorRole: userRole as RoleEnum,
      action: 'MAINTENANCE_ENABLED',
      entity: 'SYSTEM',
      requestData: { message: this.message },
      ipAddress: undefined,
      userAgent: undefined,
      endpoint: '/internal/maintenance/enable',
      method: 'POST',
      statusCode: 200,
    });

    this.loggerService.warn('Maintenance enabled', { userId });
  }

  async disable(userId: string, userRole: string) {
    if (!this.enabled) {
      throw new Error('MAINTENANCE_NOT_ENABLED');
    }

    await this.auditService.log({
      actorId: userId,
      actorRole: userRole as RoleEnum,
      action: 'MAINTENANCE_DISABLED',
      entity: 'SYSTEM',
      requestData: {
        durationMs: Date.now() - (this.enabledAt?.getTime() || Date.now()),
        totalHits: this.totalHits(),
      },
      ipAddress: undefined,
      userAgent: undefined,
      endpoint: '/internal/maintenance/disable',
      method: 'POST',
      statusCode: 200,
    });

    this.enabled = false;
    this.enabledAt = null;
    this.enabledBy = null;
    this.hits.clear();

    this.loggerService.warn('Maintenance disabled', { userId });
  }

  isEnabled() {
    return this.enabled;
  }

  shouldBypass(path: string) {
    return MAINTENANCE_BYPASS_PATHS.some(p => path.startsWith(p));
  }

  recordHit(path: string) {
    this.hits.set(path, (this.hits.get(path) || 0) + 1);
  }

  totalHits() {
    return Array.from(this.hits.values()).reduce((a, b) => a + b, 0);
  }

  status() {
    return {
      enabled: this.enabled,
      enabledAt: this.enabledAt,
      enabledBy: this.enabledBy,
      message: this.message,
      totalHits: this.totalHits(),
    };
  }

  hitsByEndpoint() {
    return Array.from(this.hits.entries()).map(([endpoint, hits]) => ({
      endpoint,
      hits,
    }));
  }
}
