import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import * as crypto from 'crypto';
import { UserSession } from './user-session.entity';
import { User } from './user.entity';
import { AuditService } from '../common/audit/audit.service';
import { RoleEnum } from '../common/enums/role.enum';
import { SessionAuditAction } from '../common/enums/session-audit.enum';
import { SESSION_CONFIG } from '../common/config/session.config';
import { PasswordUtils } from '../common/utils/password.utils';

export interface CreateSessionData {
  userId: string;
  role: RoleEnum;
  ipAddress: string;
  userAgent: string;
}


@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);
  private cleanupTimer?: NodeJS.Timeout;
  //sitory: any;

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) { }

  /* -------------------- LIFECYCLE -------------------- */

  onModuleInit() {
    this.startCleanupJob();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /* -------------------- CREATE SESSION -------------------- */

  async createSession(data: CreateSessionData): Promise<{
    jwtId: string;
    refreshToken: string;
    expiresAt: Date;
    }> {
    const user = await this.userRepo.findOne({
      where: { id: data.userId, isDeleted: false },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account deactivated');
    }

    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      throw new ForbiddenException('Account locked');
    }

    /* Enforce single session for receptionist */
    if (user.role === RoleEnum.RECEPTIONIST) {
      const activeSessions = await this.getActiveSessions(user.id);

      if (activeSessions.length >= SESSION_CONFIG.MAX_RECEPTIONIST_SESSIONS) {
        await this.revokeAllUserSessions(
          user.id,
          SessionAuditAction.CONCURRENT_LOGIN_BLOCKED,
          'Concurrent login blocked',
        );
      }
    }

    const jwtId = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(40).toString('hex');

    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + SESSION_CONFIG.ACCESS_TOKEN_TTL_MINUTES,
    );

    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() +
      SESSION_CONFIG.REFRESH_TOKEN_TTL_DAYS,
    );

    const session = this.sessionRepo.create({
      userId: user.id,
      role: user.role,
      jwtId,
      ipAddress: data.ipAddress,
      expiresAt,
      isActive: true,
      refreshTokenHash: PasswordUtils.hashToken(refreshToken),
      refreshTokenExpiresAt,
      ...(data.userAgent ? { userAgent: data.userAgent } : {}),

    });

    const saved = await this.sessionRepo.save(session);

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: SessionAuditAction.SESSION_CREATED,
      entity: 'USER_SESSION',
      entityId: saved.id,
      requestData: {
        ipAddress: data.ipAddress,

      },
      ipAddress: data.ipAddress,
      ...(data.userAgent ? { userAgent: data.userAgent } : {}),
      endpoint: '/auth/login',
      method: 'POST',
      statusCode: 200,
    });

    return {
      jwtId,
      refreshToken,
      expiresAt,
    };
  }

  /* -------------------- VALIDATE SESSION -------------------- */

  async validateSession(jwtId: string): Promise<{
    isValid: boolean;
    reason?: string;
    session?: UserSession;
  }> {
    const session = await this.sessionRepo.findOne({
      where: { jwtId, isDeleted: false },
    });

    if (!session) {
      return { isValid: false, reason: 'Session not found' };
    }

    if (!session.isActive || session.revokedAt) {
      return { isValid: false, reason: 'Session revoked' };
    }

    if (session.expiresAt <= new Date()) {
      await this.expireSession(session);
      return { isValid: false, reason: 'Session expired' };
    }

    const user = await this.userRepo.findOne({
      where: { id: session.userId, isDeleted: false, isActive: true },
    });

    if (!user) {
      await this.revokeSession(
        session.id,
        SessionAuditAction.SESSION_REVOKED,
        'User inactive',
      );
      return { isValid: false, reason: 'User inactive' };
    }

    return { isValid: true, session };
  }

  /* -------------------- REFRESH SESSION -------------------- */

  async refreshSession(
    jwtId: string,
    refreshToken: string,
  ): Promise<{ newJwtId: string; expiresAt: Date } | null> {
    const session = await this.sessionRepo.findOne({
      where: { jwtId, isActive: true, revokedAt: undefined },
    });

    if (
      !session ||
      !session.refreshTokenHash ||
      !session.refreshTokenExpiresAt
    ) {
      return null;
    }

    if (session.refreshTokenExpiresAt <= new Date()) {
      await this.expireSession(session);
      return null;
    }

    if (
      session.refreshTokenHash !==
      PasswordUtils.hashToken(refreshToken)
    ) {
      return null;
    }

    const newJwtId = crypto.randomUUID();
    const newExpiry = new Date();
    newExpiry.setMinutes(
      newExpiry.getMinutes() + SESSION_CONFIG.ACCESS_TOKEN_TTL_MINUTES,
    );

    await this.sessionRepo.update(
      { id: session.id },
      { jwtId: newJwtId, expiresAt: newExpiry },
    );

    await this.auditService.log({
      actorId: session.userId,
      actorRole: session.role,
      action: SessionAuditAction.SESSION_REFRESHED,
      entity: 'USER_SESSION',
      entityId: session.id,
      ipAddress: session.ipAddress,
      ...(session.userAgent ? { userAgent: session.userAgent } : {}),
      endpoint: '/auth/refresh',
      method: 'POST',
      statusCode: 200,
    });

    return { newJwtId, expiresAt: newExpiry };
  }

  /* -------------------- LOGOUT / REVOKE -------------------- */

  async logout(jwtId: string, actorId?: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { jwtId, isDeleted: false },
    });

    if (!session) return;

    await this.revokeSession(
      session.id,
      SessionAuditAction.SESSION_LOGOUT,
      'User logout',
      actorId,
    );
  }

  async revokeSession(
    sessionId: string,
    action: SessionAuditAction,
    reason?: string,
    actorId?: string,
  ): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, isDeleted: false },
    });

    if (!session) return;

    await this.sessionRepo.update(
      { id: sessionId },
      { isActive: false, revokedAt: new Date() },
    );

    await this.auditService.log({
      actorId: actorId ?? session.userId,
      actorRole: session.role,
      action,
      entity: 'USER_SESSION',
      entityId: session.id,
      requestData: reason ? { reason } : undefined,
      ipAddress: session.ipAddress,
      ...(session.userAgent ? { userAgent: session.userAgent } : {}),
      endpoint: '/auth/logout',
      method: 'POST',
      statusCode: 200,
    });
  }

  async revokeAllUserSessions(
    userId: string,
    action: SessionAuditAction,
    reason: string,
  ): Promise<void> {
    const sessions = await this.getActiveSessions(userId);

    if (!sessions.length) return;

    await this.sessionRepo.update(
      { id: In(sessions.map(s => s.id)) },
      { isActive: false, revokedAt: new Date() },
    );

    for (const s of sessions) {
      await this.auditService.log({
        actorId: userId,
        actorRole: s.role,
        action,
        entity: 'USER_SESSION',
        entityId: s.id,
        requestData: { reason },
        ipAddress: s.ipAddress,
        ...(s.userAgent ? { userAgent: s.userAgent } : {}),
        endpoint: 'SYSTEM',
        method: 'SYSTEM',
        statusCode: 200,
      });
    }
  }

  /* -------------------- HELPERS -------------------- */

  async getActiveSessions(userId: string): Promise<UserSession[]> {
    return this.sessionRepo.find({
      where: {
        userId,
        isActive: true,
        revokedAt: undefined,
        expiresAt: MoreThan(new Date()),
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
    });
  }

  private async expireSession(session: UserSession): Promise<void> {
    await this.sessionRepo.update(
      { id: session.id },
      { isActive: false },
    );

    await this.auditService.log({
      actorId: session.userId,
      actorRole: session.role,
      action: SessionAuditAction.SESSION_EXPIRED,
      entity: 'USER_SESSION',
      entityId: session.id,
      ipAddress: session.ipAddress,
      ...(session.userAgent ? { userAgent: session.userAgent } : {}),
      endpoint: 'SYSTEM',
      method: 'SYSTEM',
      statusCode: 200,
    });
  }

  private startCleanupJob(): void {
    const interval =
      SESSION_CONFIG.SESSION_CLEANUP_INTERVAL_HOURS *
      60 *
      60 *
      1000;

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.sessionRepo.update(
          { expiresAt: MoreThan(new Date()), isActive: true },
          {},
        );
      } catch (err) {
        this.logger.error('Session cleanup failed', err);
      }
    }, interval);
  }

  async getAllUserSessions(userId: string): Promise<UserSession[]> {
    return this.sessionRepo.find({
      where: {
        userId,
        isDeleted: false,
      },
      order: { createdAt: 'DESC' },
    });
  }

}
