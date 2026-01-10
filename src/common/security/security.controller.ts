import { Controller, Get, Patch, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { RoleEnum } from '../enums/role.enum';
import { SecurityMetricsService } from './security-metrics.service';
import { RateLimitStoreService } from './rate-limit-store.service';
import { LoggerService } from '../logger/logger.service';

@Controller('internal/security')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.ADMIN)
export class SecurityController {
  constructor(
    private readonly metrics: SecurityMetricsService,
    private readonly rateLimitStore: RateLimitStoreService,
    private readonly logger: LoggerService,
  ) {}

  @Get('metrics')
  getSecurityMetrics() {
    return this.metrics.getMetrics();
  }

  @Get('summary')
  getSecuritySummary() {
    return this.metrics.getSecuritySummary();
  }

  @Get('rate-limits')
  getRateLimitStats() {
    return this.rateLimitStore.getStats();
  }

  @Patch('unblock/ip/:ip')
  unblockIp(@Param('ip') ip: string) {
    this.rateLimitStore.clearBlock(ip, 'ip');
    
    this.logger.info('IP block manually cleared', {
      module: 'SecurityController',
      action: 'MANUAL_UNBLOCK_IP',
      ip,
    });

    return { message: `IP ${ip} has been unblocked` };
  }

  @Patch('unblock/user/:userId')
  unblockUser(@Param('userId', ParseUUIDPipe) userId: string) {
    this.rateLimitStore.clearBlock(userId, 'user');
    
    this.logger.info('User block manually cleared', {
      module: 'SecurityController',
      action: 'MANUAL_UNBLOCK_USER',
      userId,
    });

    return { message: `User ${userId} has been unblocked` };
  }

  @Patch('clear-offenses/:identifier')
  clearOffenses(@Param('identifier') identifier: string) {
    this.metrics.clearOffenses(identifier);
    
    this.logger.info('Offenses manually cleared', {
      module: 'SecurityController',
      action: 'MANUAL_CLEAR_OFFENSES',
      identifier,
    });

    return { message: `Offenses for ${identifier} have been cleared` };
  }
}