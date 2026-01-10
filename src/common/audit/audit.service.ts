import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { AuditLog } from './audit.entity';
import { RoleEnum } from '../enums/role.enum';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const SYSTEM_ACTOR_ROLE = RoleEnum.ADMIN;

interface AuditLogData {
  actorId: string | null;
  actorRole: RoleEnum | null;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method: string;
  statusCode?: number;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}


  async log(data: AuditLogData): Promise<void> {
  try {
    const auditLog = this.auditLogRepository.create({
       actorId: data.actorId ?? SYSTEM_ACTOR_ID,
       actorRole: data.actorRole ?? SYSTEM_ACTOR_ROLE,
       action: data.action,
       entity: data.entity,
       entityId: data.entityId ?? null,
       oldValue: data.oldValue ?? null,
       newValue: data.newValue ?? null,
       requestData: data.requestData ?? null,
       responseData: data.responseData ?? null,
       ipAddress: data.ipAddress ?? null,
       userAgent: data.userAgent ?? null,
       endpoint: data.endpoint ?? null,
       method: data.method,
       statusCode: data.statusCode ?? null,
       errorMessage: data.errorMessage ?? null,
    } as DeepPartial<AuditLog>);

    await this.auditLogRepository.save(auditLog);
  } catch (error) {
    const err = error as any;
    this.logger.error(
      `Audit log failed: ${err?.message ?? 'Unknown error'}`,
      err?.stack,
    );
  }
}


  private sanitizeData(data?: Record<string, any>): Record<string, any> | null {
    if (!data) return null;

    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'apikey'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}