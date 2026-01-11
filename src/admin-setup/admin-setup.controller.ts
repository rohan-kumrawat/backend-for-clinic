import { Controller, Post, Headers, ForbiddenException } from '@nestjs/common';
import { AdminSetupService } from './admin-setup.service';

@Controller('internal/admin-setup')
export class AdminSetupController {
  constructor(private readonly service: AdminSetupService) {}

  @Post()
  async createAdmin(
    @Headers('x-admin-setup-secret') secret: string,
  ) {
    if (secret !== process.env.ADMIN_SETUP_SECRET) {
      throw new ForbiddenException('Invalid setup secret');
    }

    return this.service.createAdmin();
  }
}
