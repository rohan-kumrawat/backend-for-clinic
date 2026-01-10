export interface BackupConfig {
  storagePath: string;
  retentionDays: number;
  weeklyRetentionWeeks: number;
  timeoutMinutes: number;
  compressionLevel: number;
  dbClientPath: string;
  appReadOnly: boolean;
}

export const BACKUP_CONFIG: BackupConfig = {
  storagePath: process.env.BACKUP_STORAGE_PATH || './backups',
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10),
  weeklyRetentionWeeks: parseInt(process.env.BACKUP_WEEKLY_RETENTION_WEEKS || '4', 10),
  timeoutMinutes: parseInt(process.env.BACKUP_TIMEOUT_MINUTES || '30', 10),
  compressionLevel: parseInt(process.env.BACKUP_COMPRESSION_LEVEL || '6', 10),
  dbClientPath: process.env.DB_CLIENT_PATH || '/usr/bin',
  appReadOnly: process.env.APP_READ_ONLY === 'true',
};