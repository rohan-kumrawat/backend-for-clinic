import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';
import { RoleEnum } from '../common/enums/role.enum';
import { SessionAuditAction } from '../common/enums/session-audit.enum';
import { AuditService } from '../common/audit/audit.service';

interface JwtPayload {
  sub: string;
  jti: string;
  role: RoleEnum;
  username: string;
  name: string;
  isActive: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    const jwtId = payload.jti;
    
    if (!jwtId) {
      throw new UnauthorizedException('Invalid token: missing jti');
    }

    // Validate session
    const validationResult = await this.sessionService.validateSession(jwtId);
    
    if (!validationResult.isValid) {
      // Log failed validation
      await this.auditService.log({
        actorId: payload.sub,
        actorRole: payload.role,
        action: SessionAuditAction.SESSION_VALIDATION_FAILED,
        entity: 'USER_SESSION',
        requestData: { reason: validationResult.reason },
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || null,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 401,
        errorMessage: validationResult.reason,
      });

      throw new UnauthorizedException(`Session invalid: ${validationResult.reason}`);
    }

    return {
      userId: payload.sub,
      username: payload.username,
      name: payload.name,
      role: payload.role,
      isActive: payload.isActive,
      jwtId: payload.jti,
    };
  }
}