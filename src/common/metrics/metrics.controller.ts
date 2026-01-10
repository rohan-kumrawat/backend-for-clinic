import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { RoleEnum } from '../enums/role.enum';
import { MetricsService } from './metrics.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';


@Controller('internal/metrics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.ADMIN)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  get() {
    return this.metrics.snapshot();
  }
}
