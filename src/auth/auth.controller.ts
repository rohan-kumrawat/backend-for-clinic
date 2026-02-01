import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Request,
  HttpCode,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RoleEnum } from '../common/enums/role.enum';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { LoginDto } from './dto/login.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SessionAuditAction } from 'src/common/enums/session-audit.enum';
import { UserSession } from './user-session.entity';
import { ReceptionResetPasswordDto } from './dto/reception-reset-password.dto';

interface ClientInfo {
  ipAddress: string;
  userAgent: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) { }

  private extractClientInfo(req: any): ClientInfo {
    return {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    const clientInfo = this.extractClientInfo(req);
    return this.authService.login(loginDto, clientInfo);
  }

  @Post('password-reset/request')
  @HttpCode(200)
  async requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
    @Request() req: any,
  ) {
    const clientInfo = this.extractClientInfo(req);
    return this.authService.requestPasswordReset(dto, clientInfo);
  }

  @Post('password-reset/confirm')
  @HttpCode(200)
  async confirmPasswordReset(
    @Body() dto: PasswordResetConfirmDto,
    @Request() req: any,
  ) {
    const clientInfo = this.extractClientInfo(req);
    return this.authService.confirmPasswordReset(dto, clientInfo);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(200)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Request() req: any,
  ) {
    const clientInfo = this.extractClientInfo(req);
    const userId = req.user.userId;
    return this.authService.changePassword(userId, dto, clientInfo);
  }

  @Post('receptionists')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async createReceptionist(@Body() createUserDto: any) {
    return this.authService.createUser(createUserDto, RoleEnum.RECEPTIONIST);
  }

  @Get('receptionists')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async getReceptionists() {
    return this.authService.getUsersByRole(RoleEnum.RECEPTIONIST);
  }

  @Post('receptionists/reset-password')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @HttpCode(200)
  async resetReceptionistPassword(
    @Body() dto: ReceptionResetPasswordDto,
    @Request() req: any,
  ) {
    const adminId = req.user.userId;
    return this.authService.resetReceptionistPassword(dto, adminId);
  }
  @Delete('receptionists/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async softDeleteReceptionist(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const adminId = req.user.userId;
    return this.authService.softDeleteReceptionist(id, adminId);
  }


  @Patch('receptionists/:id/activate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async activateReceptionist(@Param('id', ParseUUIDPipe) id: string) {
    return this.authService.updateUserStatus(id, true);
  }

  @Patch('receptionists/:id/deactivate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async deactivateReceptionist(@Param('id', ParseUUIDPipe) id: string) {
    return this.authService.updateUserStatus(id, false);
  }

  @Post('users/:id/unlock')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async unlockAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const clientInfo = this.extractClientInfo(req);
    const adminId = req.user.userId;
    return this.authService.unlockAccount(id, adminId, clientInfo);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async logout(
    @Body() logoutDto: LogoutDto,
    @Request() req: any,
  ) {
    const clientInfo = this.extractClientInfo(req);
    const jwtId = req.user.jwtId;
    const userId = req.user.userId;

    await this.authService.logout(jwtId, userId, clientInfo);

    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  @HttpCode(200)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: any,
  ) {
    const clientInfo = this.extractClientInfo(req);
    return this.authService.refreshToken(refreshTokenDto, clientInfo);
  }

  @Get('users/:id/sessions')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async getUserSessions(
    @Param('id', ParseUUIDPipe) userId: string,
  ) {
    const sessions = await this.sessionService.getAllUserSessions(userId);

    // Sanitize response
    return sessions.map((session: UserSession) => ({
      id: session.id,
      role: session.role,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceInfo: session.deviceInfo,
      location: session.location,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      isActive: session.isActive && !session.revokedAt && session.expiresAt > new Date(),
    }));
  }

  @Delete('users/:id/sessions/:sessionId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async revokeUserSession(
    @Param('id', ParseUUIDPipe) userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Request() req: any,
  ) {
    const clientInfo = this.extractClientInfo(req);
    const adminId = req.user.userId;

    await this.sessionService.revokeSession(
      sessionId,
      SessionAuditAction.SESSION_REVOKED_ADMIN,
      'Admin forced logout',
      adminId,
    );

    return { message: 'Session revoked successfully' };
  }

  @Post('users/:id/logout-all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async logoutAllUserSessions(
    @Param('id', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ) {
    const clientInfo = this.extractClientInfo(req);
    const adminId = req.user.userId;

    const sessionsRevoked = await this.sessionService.revokeAllUserSessions(
      userId,
      adminId,
      'Admin forced logout all',
    );

    return {
      message: `Revoked ${sessionsRevoked} active sessions`,
      sessionsRevoked,
    };
  }
}