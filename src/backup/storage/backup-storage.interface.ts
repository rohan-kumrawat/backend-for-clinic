export interface BackupFile {
  filename: string;
  filePath: string;
  fileSize: number;
  createdAt: Date;
  checksum: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  freeSpace: number;
  usedSpace: number;
}

export interface BackupStorage {
  saveBackup(
    buffer: Buffer,
    filename: string,
  ): Promise<{ filePath: string; fileSize: number }>;

  getBackup(filePath: string): Promise<Buffer>;

  listBackups(): Promise<BackupFile[]>;

  deleteBackup(filePath: string): Promise<void>;

  getStorageStats(): Promise<StorageStats>;

  validateBackup(filePath: string): Promise<boolean>;

  cleanupOldBackups(retentionDays: number): Promise<string[]>;
}