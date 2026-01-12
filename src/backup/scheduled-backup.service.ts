import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupService } from './backup.service';
import { Backup, BackupType } from './backup.entity';

@Injectable()
export class ScheduledBackupService {
  private readonly logger = new Logger(ScheduledBackupService.name);

  constructor(
    @InjectRepository(Backup)
    private readonly backupRepository: Repository<Backup>,
    private readonly backupService: BackupService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyBackup() {
    this.logger.log('Starting scheduled daily backup');
    
    try {
      // Create a system backup (no user context)
      const backup = await this.backupService.createBackup({
        type: BackupType.SCHEDULED,
        createdBy: null,
      });
      
      this.logger.log(`Scheduled backup completed: ${backup.id}`);
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Scheduled backup failed: ${err.message}`);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async weeklyCleanup() {
    this.logger.log('Starting weekly backup cleanup');
    
    try {
      // This would implement the weekly retention policy
      // For now, we just log it
      this.logger.log('Weekly cleanup triggered');
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Weekly cleanup failed: ${err.message}`);
    }
  }
}