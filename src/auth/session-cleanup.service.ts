import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserSession } from './user-session.entity';
import { AuditService } from '../common/audit/audit.service';
import { SessionAuditAction } from '../common/enums/session-audit.enum';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    private readonly auditService: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupExpiredSessions() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days retention

      const expiredSessions = await this.sessionRepository.find({
        where: {
          expiresAt: LessThan(cutoffDate),
          isDeleted: false,
        },
        select: ['id', 'userId', 'role'],
      });

      if (expiredSessions.length === 0) {
        return;
      }

      const result = await this.sessionRepository
        .createQueryBuilder()
        .delete()
        .where('expiresAt < :cutoffDate', { cutoffDate })
        .andWhere('isDeleted = false')
        .execute();

      // Log cleanup
      for (const session of expiredSessions) {
        await this.auditService.log({
          actorId: session.userId,
          actorRole: session.role,
          action: SessionAuditAction.SESSION_EXPIRED,
          entity: 'USER_SESSION',
          entityId: session.id,
          requestData: { cleanup: true },
          endpoint: 'SYSTEM_CLEANUP',
          method: 'SYSTEM',
          statusCode: 200,
        });
      }

      this.logger.log(`Cleaned up ${result.affected} expired sessions`);
    } catch (error: unknown) {
  if (error instanceof Error) {
    this.logger.error(`Session cleanup failed: ${error.message}`, error.stack);
        } else {
          this.logger.error('Session cleanup failed');
        }
    }
  }
}