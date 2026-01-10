import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { RoleEnum } from '../enums/role.enum';
import { RateLimitStoreService } from './rate-limit-store.service';

@Controller('rate-limit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.ADMIN)
export class RateLimitController {
  constructor(private readonly rateLimitStore: RateLimitStoreService) {}

  @Get('stats')
  async getStats() {
    return this.rateLimitStore.getStats();
  }
}