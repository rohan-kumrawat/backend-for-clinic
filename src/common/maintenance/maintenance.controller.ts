import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { RoleEnum } from '../enums/role.enum';
import { MaintenanceService } from './maintenance.service';

@Controller('internal/maintenance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Post('enable')
  @Roles(RoleEnum.ADMIN)
  async enable(
    @Req() req: Request,
    @Body('message') message?: string,
  ) {
    const user = req.user as any;
    await this.service.enable(user.userId, user.role, message);
    return this.service.status();
  }

  @Post('disable')
  @Roles(RoleEnum.ADMIN)
  async disable(@Req() req: Request) {
    const user = req.user as any;
    await this.service.disable(user.userId, user.role);
    return this.service.status();
  }

  @Get('status')
  @Roles(RoleEnum.ADMIN)
  status() {
    return {
      ...this.service.status(),
      hitsByEndpoint: this.service.hitsByEndpoint(),
    };
  }
}
