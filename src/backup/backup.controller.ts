import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  ParseUUIDPipe,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReadOnlyGuard } from '../common/guards/read-only.guard';
import { RoleEnum } from '../common/enums/role.enum';
import { BackupService } from './backup.service';
import { BackupType } from './backup.entity';

interface CreateBackupDto {
  type?: BackupType;
}

interface RestoreBackupDto {
  confirm: boolean;
}

@Controller('backup')
@UseGuards(AuthGuard('jwt'), RolesGuard, ReadOnlyGuard)
@Roles(RoleEnum.ADMIN)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  async createBackup(
    @Body() createBackupDto: CreateBackupDto,
    @Request() req: any,
  ) {
    const createdBy = req.user.userId;
    return this.backupService.createBackup({
      type: createBackupDto.type,
      createdBy,
    });
  }

  @Get()
  async getBackups(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.backupService.getBackups(limit);
  }

  @Get('stats')
  async getStats() {
    return this.backupService.getStats();
  }

  @Get('storage')
  async getStorageStats() {
    return this.backupService.getStorageStats();
  }

  @Get('health')
  async getHealth() {
    return this.backupService.getSystemHealth();
  }

  @Get(':id')
  async getBackup(@Param('id', ParseUUIDPipe) id: string) {
    return this.backupService.getBackup(id);
  }

  @Post(':id/verify')
  @HttpCode(200)
  async verifyBackup(@Param('id', ParseUUIDPipe) id: string) {
    const isValid = await this.backupService.verifyBackup(id);
    return { valid: isValid };
  }

  @Post(':id/restore')
  @HttpCode(200)
  async restoreBackup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() restoreBackupDto: RestoreBackupDto,
    @Request() req: any,
  ) {
    const createdBy = req.user.userId;
    await this.backupService.restoreBackup({
      backupId: id,
      createdBy,
      confirm: restoreBackupDto.confirm,
    });
    
    return { message: 'Restore completed successfully' };
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteBackup(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const actorId = req.user.userId;
    await this.backupService.deleteBackup(id, actorId);
  }

  @Post('cleanup')
  @HttpCode(200)
  async triggerCleanup() {
    // This would trigger the cleanup process
    // In a real implementation, this would call the cleanup method
    return { message: 'Cleanup triggered. This runs automatically on backup creation.' };
  }
}