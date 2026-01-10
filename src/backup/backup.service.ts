import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { Backup, BackupStatus, BackupType } from './backup.entity';
import { LocalBackupStorage } from './storage/local-backup.storage';
import { DatabaseService } from './database/database.service';
import { AuditService } from '../common/audit/audit.service';
import { BACKUP_CONFIG } from '../common/config/backup.config';
import { RoleEnum } from '../common/enums/role.enum';

export interface CreateBackupOptions {
  type?: BackupType;
  createdBy?: string | null;
}

export interface RestoreBackupOptions {
  backupId: string;
  createdBy?: string | null;
  confirm: boolean;
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackup: Date | null;
  averageSize: number;
  failedBackups: number;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private isRestoring = false;

  constructor(
    @InjectRepository(Backup)
    private readonly backupRepository: Repository<Backup>,
    private readonly backupStorage: LocalBackupStorage,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  /* ================= CREATE BACKUP ================= */

  async createBackup(options: CreateBackupOptions): Promise<Backup> {
    if (this.isRestoring) {
      throw new ForbiddenException(
        'Cannot create backup while restore is in progress',
      );
    }

    const startTime = Date.now();

    const backup: Backup = this.backupRepository.create({
      type: options.type ?? BackupType.MANUAL,
      status: BackupStatus.IN_PROGRESS,
      createdBy: options.createdBy ?? null,
      tableCount: 0,
      fileSize: 0,
      checksum: '',
      filename: '',
      filePath: '',
    });

    const savedBackup = await this.backupRepository.save(backup);

    try {
      const dbInfo = await this.databaseService.getDatabaseInfo();

      const backupBuffer = await this.databaseService.createBackup();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}-${savedBackup.id}.sql.gz`;

      const { filePath, fileSize } =
        await this.backupStorage.saveBackup(backupBuffer, filename);

      const checksum = crypto
        .createHash('sha256')
        .update(backupBuffer)
        .digest('hex');

      const isValid = await this.backupStorage.validateBackup(filePath);
      if (!isValid) {
        throw new Error('Backup file validation failed');
      }

      const backupDuration = (Date.now() - startTime) / 1000;

      savedBackup.status = BackupStatus.COMPLETED;
      savedBackup.completedAt = new Date();
      savedBackup.filename = filename;
      savedBackup.filePath = filePath;
      savedBackup.fileSize = fileSize;
      savedBackup.checksum = checksum;
      savedBackup.databaseVersion = dbInfo.version;
      savedBackup.tableCount = dbInfo.tableCount;
      savedBackup.backupDuration = backupDuration;
      savedBackup.metadata = {
        dbSize: dbInfo.size,
        compressionLevel: BACKUP_CONFIG.compressionLevel,
      };

      await this.backupRepository.save(savedBackup);

      await this.auditService.log({
        actorId: options.createdBy ?? null,
        actorRole: RoleEnum.ADMIN,
        action: 'BACKUP_CREATED',
        entity: 'BACKUP',
        entityId: savedBackup.id,
        endpoint: '/api/v1/backup',
        method: 'POST',
        statusCode: 201,
      });

      await this.cleanupOldBackups();

      this.logger.log(`Backup created successfully: ${savedBackup.id}`);
      return savedBackup;
    } catch (error) {
      const err = error as Error;

      savedBackup.status = BackupStatus.FAILED;
      savedBackup.errorMessage = err.message;
      await this.backupRepository.save(savedBackup);

      await this.auditService.log({
        actorId: options.createdBy ?? null,
        actorRole: RoleEnum.ADMIN,
        action: 'BACKUP_FAILED',
        entity: 'BACKUP',
        entityId: savedBackup.id,
        errorMessage: err.message,
        endpoint: '/api/v1/backup',
        method: 'POST',
        statusCode: 500,
      });

      this.logger.error(`Backup failed: ${err.message}`);
      throw new BadRequestException(`Backup creation failed: ${err.message}`);
    }
  }

  /* ================= RESTORE BACKUP ================= */

  async restoreBackup(options: RestoreBackupOptions): Promise<void> {
    if (!options.confirm) {
      throw new BadRequestException('Restore confirmation required');
    }

    if (this.isRestoring) {
      throw new ForbiddenException('Restore already in progress');
    }

    this.isRestoring = true;

    try {
      const backup = await this.getBackup(options.backupId);

      if (backup.status !== BackupStatus.COMPLETED) {
        throw new BadRequestException('Backup is not restorable');
      }

      const buffer = await this.backupStorage.getBackup(backup.filePath);

      const checksum = crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');

      if (checksum !== backup.checksum) {
        throw new BadRequestException('Backup checksum mismatch');
      }

      await this.databaseService.restoreBackup(buffer);

      await this.auditService.log({
        actorId: options.createdBy ?? null,
        actorRole: RoleEnum.ADMIN,
        action: 'RESTORE_COMPLETED',
        entity: 'BACKUP',
        entityId: backup.id,
        endpoint: '/api/v1/backup/restore',
        method: 'POST',
        statusCode: 200,
      });
    } finally {
      this.isRestoring = false;
    }
  }

  /* ================= DELETE BACKUP ================= */

  async deleteBackup(id: string, actorId?: string | null): Promise<void> {
  const backup = await this.getBackup(id);

  if (backup.status === BackupStatus.IN_PROGRESS) {
    throw new BadRequestException('Cannot delete backup in progress');
  }

  try {
    // Delete file from storage
    if (backup.filePath) {
      await this.backupStorage.deleteBackup(backup.filePath);
    }

    // Soft delete record
    await this.backupRepository.update(
      { id },
      {
        isDeleted: true,
        status: BackupStatus.DELETED,
      },
    );

    // Audit log
    await this.auditService.log({
      actorId: actorId ?? null,
      actorRole: RoleEnum.ADMIN,
      action: 'BACKUP_DELETED',
      entity: 'BACKUP',
      entityId: id,
      endpoint: `/api/v1/backup/${id}`,
      method: 'DELETE',
      statusCode: 200,
    });
  } catch (error) {
    const err = error as Error;
    this.logger.error(`Failed to delete backup: ${err.message}`);
    throw new BadRequestException(`Failed to delete backup: ${err.message}`);
  }
}


  /* ================= QUERIES ================= */

  async getBackups(limit = 50): Promise<Backup[]> {
    return this.backupRepository.find({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getBackup(id: string): Promise<Backup> {
    const backup = await this.backupRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    return backup;
  }

  async getStats(): Promise<BackupStats> {
    const completed = await this.backupRepository.find({
      where: { isDeleted: false, status: BackupStatus.COMPLETED },
    });

    const totalSize = completed.reduce((s, b) => s + b.fileSize, 0);

    return {
      totalBackups: completed.length,
      totalSize,
      averageSize: completed.length ? totalSize / completed.length : 0,
      lastBackup:
        completed.length > 0
          ? completed.reduce((a, b) =>
              b.completedAt && (!a || b.completedAt > a)
                ? b.completedAt
                : a,
            null as Date | null)
          : null,
      failedBackups: await this.backupRepository.count({
        where: { isDeleted: false, status: BackupStatus.FAILED },
      }),
    };
  }

  /* ================= HEALTH & VERIFY ================= */

  async getStorageStats() {
    return this.backupStorage.getStorageStats();
  }

  async verifyBackup(id: string): Promise<boolean> {
    try {
      const backup = await this.getBackup(id);
      const buffer = await this.backupStorage.getBackup(backup.filePath);
      const checksum = crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');
      return checksum === backup.checksum;
    } catch {
      return false;
    }
  }

  async getSystemHealth() {
    const db = await this.databaseService.verifyConnection();
    const storage = await this.getStorageStats();
    const stats = await this.getStats();

    return {
      databaseConnected: db,
      storageAccessible: storage.totalFiles >= 0,
      backupCount: stats.totalBackups,
      lastSuccessfulBackup: stats.lastBackup,
      isRestoring: this.isRestoring,
    };
  }

  /* ================= CLEANUP ================= */

  private async cleanupOldBackups(): Promise<void> {
    try {
      await this.backupStorage.cleanupOldBackups(
        BACKUP_CONFIG.retentionDays,
      );
    } catch (err) {
      this.logger.error('Backup cleanup failed');
    }
  }
}
