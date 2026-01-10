import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { DatabaseService } from './database/database.service';
import { LocalBackupStorage } from './storage/local-backup.storage';
import { Backup } from './backup.entity';
import { ScheduledBackupService } from './scheduled-backup.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Backup]),
    ScheduleModule.forRoot(),
  ],
  controllers: [BackupController],
  providers: [
    BackupService,
    DatabaseService,
    LocalBackupStorage,
    ScheduledBackupService,
  ],
  exports: [
    BackupService,
    DatabaseService,
    LocalBackupStorage,
  ],
})
export class BackupModule {}