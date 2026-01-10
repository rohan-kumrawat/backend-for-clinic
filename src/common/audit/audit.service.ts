import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit.entity';
import { RoleEnum } from '../enums/role.enum';

const SYSTEM_ACTOR_ID = 'system';
const SYSTEM_ROLE = RoleEnum.ADMIN;

export interface AuditLogInput {
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
  endpoint: string;
  method: string;
  statusCode?: number;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(data: AuditLogInput): Promise<void> {
    try {
      const log = this.repo.create({
        actorId: data.actorId ?? SYSTEM_ACTOR_ID,
        actorRole: data.actorRole ?? SYSTEM_ROLE,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId ?? null,
        requestData: data.requestData ?? null,
        responseData: data.responseData ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        endpoint: data.endpoint,
        method: data.method,
        statusCode: data.statusCode ?? null,
        errorMessage: data.errorMessage ?? null,
      });

      await this.repo.save(log);
    } catch (e: any) {
      this.logger.error(`Audit log failed: ${e.message}`);
    }
  }
}
