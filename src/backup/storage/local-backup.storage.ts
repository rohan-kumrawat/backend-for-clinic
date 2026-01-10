import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { BACKUP_CONFIG } from '../../common/config/backup.config';
import {
  BackupStorage,
  BackupFile,
  StorageStats,
} from './backup-storage.interface';

@Injectable()
export class LocalBackupStorage implements BackupStorage {
  private readonly logger = new Logger(LocalBackupStorage.name);
  private readonly storagePath: string;

  constructor() {
    this.storagePath = BACKUP_CONFIG.storagePath;
    this.ensureStorageDirectory();
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      this.logger.log(`Backup storage directory ready: ${this.storagePath}`);
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Failed to create backup directory: ${err.message}`);
      throw error;
    }
  }

  async saveBackup(
    buffer: Buffer,
    filename: string,
  ): Promise<{ filePath: string; fileSize: number }> {
    const filePath = path.join(this.storagePath, filename);
    
    try {
      await fs.writeFile(filePath, buffer);
      const stats = await fs.stat(filePath);
      
      this.logger.log(`Backup saved: ${filePath} (${stats.size} bytes)`);
      
      return {
        filePath,
        fileSize: stats.size,
      };
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Failed to save backup: ${err.message}`);
      throw error;
    }
  }

  async getBackup(filePath: string): Promise<Buffer> {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Failed to read backup: ${err.message}`);
      throw error;
    }
  }

  async listBackups(): Promise<BackupFile[]> {
    try {
      const files = await fs.readdir(this.storagePath);
      const backupFiles: BackupFile[] = [];

      for (const file of files) {
        if (file.endsWith('.sql.gz')) {
          const filePath = path.join(this.storagePath, file);
          const stats = await fs.stat(filePath);
          const checksum = await this.calculateChecksum(filePath);

          backupFiles.push({
            filename: file,
            filePath,
            fileSize: stats.size,
            createdAt: stats.birthtime,
            checksum,
          });
        }
      }

      // Sort by creation date (newest first)
      return backupFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Failed to list backups: ${err.message}`);
      throw error;
    }
  }

  async deleteBackup(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.log(`Backup deleted: ${filePath}`);
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Failed to delete backup: ${err.message}`);
      throw error;
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    try {
      const backupFiles = await this.listBackups();
      const totalSize = backupFiles.reduce((sum, file) => sum + file.fileSize, 0);
      const totalFiles = backupFiles.length;

      // For local filesystem, we can't reliably get free space without additional packages
      // This is a simplified implementation
      const freeSpace = 0; // Would need 'diskusage' or similar package
      const usedSpace = totalSize;

      return {
        totalFiles,
        totalSize,
        freeSpace,
        usedSpace,
      };
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Failed to get storage stats: ${err.message}`);
      throw error;
    }
  }

  async validateBackup(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      
      // Check if file exists and has content
      if (!stats.isFile() || stats.size === 0) {
        return false;
      }

      // Check if it's a valid gzip file by reading first few bytes
      const fd = await fs.open(filePath, 'r');
      const buffer = Buffer.alloc(2);
      await fd.read(buffer, 0, 2, 0);
      await fd.close();

      // Gzip magic number: 0x1f 0x8b
      const isValidGzip = buffer[0] === 0x1f && buffer[1] === 0x8b;
      
      return isValidGzip;
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Backup validation failed: ${err.message}`);
      return false;
    }
  }

  async cleanupOldBackups(retentionDays: number): Promise<string[]> {
    try {
      const backupFiles = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const filesToDelete: string[] = [];
      const deletedFiles: string[] = [];

      // Identify files older than retention period
      for (const file of backupFiles) {
        if (file.createdAt < cutoffDate) {
          filesToDelete.push(file.filePath);
        }
      }

      // Delete files
      for (const filePath of filesToDelete) {
        try {
          await this.deleteBackup(filePath);
          deletedFiles.push(path.basename(filePath));
        } catch (error) {
            const err = error as Error;
          this.logger.error(`Failed to delete old backup ${filePath}: ${err.message}`);
        }
      }

      if (deletedFiles.length > 0) {
        this.logger.log(`Cleaned up ${deletedFiles.length} old backups`);
      }

      return deletedFiles;
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Cleanup failed: ${err.message}`);
      throw error;
    }
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      const hash = crypto.createHash('sha256');
      const stream = fsSync.createReadStream(filePath);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
      });
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Checksum calculation failed: ${err.message}`);
      return 'ERROR';
    }
  }
}