import * as crypto from 'crypto';
import * as path from 'path';

export class BackupUtils {
  static generateBackupFilename(id: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `backup-${timestamp}-${id}.sql.gz`;
  }

  static calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  static getRetentionDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  static isValidBackupFilename(filename: string): boolean {
    const pattern = /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9-]+\.sql\.gz$/;
    return pattern.test(filename);
  }

  static extractTimestampFromFilename(filename: string): Date | null {
    try {
      const match = filename.match(/backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
      if (match) {
        const timestamp = match[1].replace(/-/g, ':').replace('T', 'T');
        return new Date(timestamp);
      }
      return null;
    } catch {
      return null;
    }
  }
}