import { Controller, Post, Headers, ForbiddenException, Body } from '@nestjs/common';
import { AdminSetupService } from './admin-setup.service';

@Controller('internal/admin-setup')
export class AdminSetupController {
  constructor(private readonly service: AdminSetupService) {}

  @Post()
async createAdmin(
  @Headers('x-admin-setup-secret') secret: string,
  @Body() body: any,
) {
  if (secret !== process.env.ADMIN_SETUP_SECRET) {
    throw new ForbiddenException('Invalid setup secret');
  }

  return this.service.createAdmin(body);
}

}
