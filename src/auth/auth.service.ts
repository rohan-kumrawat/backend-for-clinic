import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';

import { User } from './user.entity';
import { AuditService } from '../common/audit/audit.service';
import { RoleEnum } from '../common/enums/role.enum';
import { LoginDto } from './dto/login.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PasswordUtils } from '../common/utils/password.utils';
import { SECURITY_CONSTANTS } from '../common/constants/security.constants';
import { SessionService } from './session.service';
import { ClientInfo } from './types/client-info.type';
import { LoggerService } from '../common/logger/logger.service';
import { EmailService } from '../common/email/email.service';
import { SessionAuditAction } from '../common/enums/session-audit.enum';
import { ReceptionResetPasswordDto } from './dto/reception-reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly sessionService: SessionService,
    private readonly loggerService: LoggerService,
    private readonly emailService: EmailService,
  ) { }

  /* ================= LOGIN ================= */

  async login(loginDto: LoginDto, clientInfo: ClientInfo) {
    try {
      const user = await this.userRepository.findOne({
        where: { username: loginDto.username, isDeleted: false },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        throw new ForbiddenException('Account is temporarily locked');
      }

      const passwordValid = await PasswordUtils.comparePassword(
        loginDto.password,
        user.password,
      );

      if (!passwordValid) {
        user.failedLoginAttempts += 1;

        if (
          user.failedLoginAttempts >=
          SECURITY_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS
        ) {
          const lockUntil = new Date();
          lockUntil.setMinutes(
            lockUntil.getMinutes() +
            SECURITY_CONSTANTS.ACCOUNT_LOCK_DURATION_MINUTES,
          );
          user.accountLockedUntil = lockUntil;
        }

        await this.userRepository.save(user);
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.isActive) {
        throw new ForbiddenException('Account is deactivated');
      }

      user.failedLoginAttempts = 0;
      user.accountLockedUntil = null;
      await this.userRepository.save(user);

      const session = await this.sessionService.createSession({
        userId: user.id,
        role: user.role,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
      const payload = {
        sub: user.id,
        jti: session.jwtId,
        username: user.username,
        role: user.role,
        name: user.name,
        isActive: user.isActive,
      };


      await this.auditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'LOGIN_SUCCESS',
        entity: 'USER',
        entityId: user.id,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        endpoint: '/auth/login',
        method: 'POST',
        statusCode: 200,
      });


      return {
        accessToken: this.jwtService.sign(payload),
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        },
      };
    } catch (err) {
      const error = err as Error;

      this.loggerService.error('Login failed', {
        message: error.message,
        stack: error.stack,
      });

      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Login failed');
    }
  }

  /* ================= USER CREATION ================= */

  async createUser(createUserDto: any, role: RoleEnum) {
    const { password, ...rest } = createUserDto;

    const existing = await this.userRepository.findOne({
      where: { username: rest.username, isDeleted: false },
    });

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    if (!PasswordUtils.validatePasswordStrength(password)) {
      throw new BadRequestException('Weak password');
    }

    const hashedPassword = await PasswordUtils.hashPassword(password);

    const user = this.userRepository.create({
      ...rest,
      password: hashedPassword,
      role,
      isActive: true,
      failedLoginAttempts: 0,
      accountLockedUntil: null,
    });

    return this.userRepository.save(user);
  }

  /* ================= ADMIN PASSWORD RESET ================= */

  async requestPasswordReset(
    dto: PasswordResetRequestDto,
    clientInfo: ClientInfo,
  ) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email, isDeleted: false, isActive: true },
    });

    // 🔒 Do not reveal account existence
    if (!user) {
      return { message: 'If account exists, reset token sent' };
    }

    const token = PasswordUtils.generateResetToken();
    const hashedToken = PasswordUtils.hashToken(token);

    const expiry = new Date();
    expiry.setMinutes(
      expiry.getMinutes() +
      SECURITY_CONSTANTS.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
    );

    user.passwordResetToken = hashedToken;
    user.passwordResetTokenExpiresAt = expiry;

    await this.userRepository.save(user);

    await this.emailService.sendPasswordResetEmail(
      user.email,
      token,
    );

    return { message: 'Password reset link sent if account exists' };
  }


  async confirmPasswordReset(
    dto: PasswordResetConfirmDto,
    clientInfo: ClientInfo,
  ) {
    const hashedToken = PasswordUtils.hashToken(dto.token);

    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetTokenExpiresAt: MoreThan(new Date()),
        isDeleted: false,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    // 🔐 PASSWORD STRENGTH CHECK (CRITICAL)
    if (!PasswordUtils.validatePasswordStrength(dto.newPassword)) {
      throw new BadRequestException('Weak password');
    }

    user.password = await PasswordUtils.hashPassword(dto.newPassword);
    user.passwordResetToken = null;
    user.passwordResetTokenExpiresAt = null;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;

    await this.userRepository.save(user);

    // 🔥 REVOKE ALL EXISTING SESSIONS
    await this.sessionService.revokeAllUserSessions(
      user.id,
      SessionAuditAction.PASSWORD_RESET,
      'Password reset',
    );

    // 🧾 AUDIT LOG
    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'USER',
      entityId: user.id,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      endpoint: '/auth/password-reset/confirm',
      method: 'POST',
      statusCode: 200,
    });

    return { message: 'Password reset successful' };
  }


  /* ================= LOGOUT ================= */

  async logout(jwtId: string, userId: string, clientInfo: ClientInfo) {
    await this.sessionService.logout(jwtId, userId);
  }

  /* ================= OTHER ================= */

  async getUsersByRole(role: RoleEnum) {
    return this.userRepository.find({
      where: { role, isDeleted: false },
    });
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) throw new NotFoundException('User not found');

    user.isActive = isActive;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;

    return this.userRepository.save(user);
  }

  async unlockAccount(
    userId: string,
    adminId: string,
    clientInfo: ClientInfo,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) throw new NotFoundException('User not found');

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;

    await this.userRepository.save(user);

    return { message: 'Account unlocked' };
  }

  async refreshToken(dto: RefreshTokenDto, clientInfo: ClientInfo) {
    const decoded = this.jwtService.decode(dto.accessToken) as {
      jti: string;
      sub: string;
    };

    if (!decoded?.jti || !decoded?.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    const refreshed = await this.sessionService.refreshSession(
      decoded.jti,
      dto.refreshToken,
    );

    if (!refreshed) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: decoded.sub, isDeleted: false, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        jti: refreshed.newJwtId,
        username: user.username,
        role: user.role,
      }),
      expiresIn: refreshed.expiresAt,
    };
  }

  /* ================= ADMIN CHANGE PASSWORD ================= */

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    clientInfo: ClientInfo,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await PasswordUtils.comparePassword(
      dto.currentPassword,
      user.password,
    );

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (!PasswordUtils.validatePasswordStrength(dto.newPassword)) {
      throw new BadRequestException('Weak password');
    }

    const samePassword = await PasswordUtils.comparePassword(
      dto.newPassword,
      user.password,
    );

    if (samePassword) {
      throw new ConflictException(
        'New password must be different from old password',
      );
    }

    user.password = await PasswordUtils.hashPassword(dto.newPassword);
    user.passwordResetToken = null;
    user.passwordResetTokenExpiresAt = null;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;

    await this.userRepository.save(user);

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'PASSWORD_CHANGE',
      entity: 'USER',
      entityId: user.id,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      endpoint: '/auth/change-password',
      method: 'POST',
      statusCode: 200,
    });

    return { message: 'Password changed successfully' };
  }

  /* ================= RECEPTIONIST PASSWORD RESET ================= */

  async resetReceptionistPassword(
    dto: ReceptionResetPasswordDto,
    adminId: string,
  ) {
    const { receptionistId, newPassword } = dto;

    // 🔎 Fetch user
    const user = await this.userRepository.findOne({
      where: {
        id: receptionistId,
        role: RoleEnum.RECEPTIONIST,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Receptionist not found');
    }

    if (!PasswordUtils.validatePasswordStrength(newPassword)) {
      throw new BadRequestException('Weak password');
    }

    // 🔐 Hash password
    user.password = await PasswordUtils.hashPassword(newPassword);

    // 🔄 Reset security flags
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiresAt = null;

    await this.userRepository.save(user);

    // 🔥 Revoke all active sessions (VERY IMPORTANT)
    await this.sessionService.revokeAllUserSessions(
      user.id,
      SessionAuditAction.PASSWORD_RESET,
      'Admin reset receptionist password',
    );

    // 🧾 Audit log
    await this.auditService.log({
      actorId: adminId,
      actorRole: RoleEnum.ADMIN,
      action: 'ADMIN_RESET_RECEPTIONIST_PASSWORD',
      entity: 'USER',
      entityId: user.id,
      endpoint: '/auth/receptionists/reset-password',
      method: 'POST',
      statusCode: 200,
    });

    return { message: 'Receptionist password reset successfully' };
  }


  /* ================= RECEPTIONIST SOFT DELETE ================= */

  async softDeleteReceptionist(receptionistId: string, adminId: string) {
    const user = await this.userRepository.findOne({
      where: {
        id: receptionistId,
        role: RoleEnum.RECEPTIONIST,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Receptionist not found');
    }

    user.isDeleted = true;
    user.isActive = false; // Deactivate as well

    await this.userRepository.save(user);

    await this.sessionService.revokeAllUserSessions(
      user.id,
      SessionAuditAction.ACCOUNT_DELETED,
      'Admin soft deleted receptionist',
    );

    // 🧾 Audit log
    await this.auditService.log({
      actorId: adminId,
      actorRole: RoleEnum.ADMIN,
      action: 'ADMIN_DELETE_RECEPTIONIST',
      entity: 'USER',
      entityId: user.id,
      endpoint: '/auth/receptionists/:id',
      method: 'DELETE',
      statusCode: 200,
    });

    return { message: 'Receptionist deleted successfully' };
  }
}
