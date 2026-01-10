import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as zlib from 'zlib';
import { BACKUP_CONFIG } from '../../common/config/backup.config';
import { spawn } from 'child_process';

const execAsync = promisify(exec);

interface DatabaseInfo {
  version: string;
  tableCount: number;
  size: string;
}

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.timeoutMs = BACKUP_CONFIG.timeoutMinutes * 60 * 1000;
  }

  private getDatabaseConfig() {
    return {
      host: this.configService.get('database.host'),
      port: this.configService.get('database.port'),
      username: this.configService.get('database.username'),
      password: this.configService.get('database.password'),
      name: this.configService.get('database.name'),
    };
  }

  async createBackup(): Promise<Buffer> {
    const dbConfig = this.getDatabaseConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    
    const pgDumpPath = `${BACKUP_CONFIG.dbClientPath}/pg_dump`;
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };

    const command = [
      pgDumpPath,
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--username=${dbConfig.username}`,
      `--dbname=${dbConfig.name}`,
      '--no-password',
      '--verbose',
      '--format=plain',
      '--no-owner',
      '--no-privileges',
      '--exclude-table-data=audit_logs', // Exclude audit logs for smaller backups
      '--exclude-table-data=backup_logs', // Exclude backup logs themselves
    ].join(' ');

    this.logger.log(`Starting database backup: ${dbConfig.name}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        env,
        maxBuffer: 1024 * 1024 * 100, // 100MB buffer
        timeout: this.timeoutMs,
      });

      if (stderr) {
        this.logger.warn(`pg_dump stderr: ${stderr}`);
      }

      // Compress the backup
      const compressed = await this.compressBuffer(Buffer.from(stdout));
      
      this.logger.log(`Backup completed successfully: ${compressed.length} bytes`);
      
      return compressed;
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Backup failed: ${err.message}`);
      throw new Error(`Database backup failed: ${err.message}`);
    }
  }

  async restoreBackup(buffer: Buffer): Promise<void> {
  const dbConfig = this.getDatabaseConfig();
  const decompressed = await this.decompressBuffer(buffer);

  return new Promise((resolve, reject) => {
    const psql = spawn('psql', [
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--username=${dbConfig.username}`,
      `--dbname=${dbConfig.name}`,
      '--no-password',
      '--single-transaction',
    ], {
      env: {
        ...process.env,
        PGPASSWORD: dbConfig.password,
      },
    });

    psql.stdin.write(decompressed);
    psql.stdin.end();

    psql.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`psql exited with code ${code}`));
    });
  });
}


  async getDatabaseInfo(): Promise<DatabaseInfo> {
    const dbConfig = this.getDatabaseConfig();
    const psqlPath = `${BACKUP_CONFIG.dbClientPath}/psql`;
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };

    const queryCommand = [
      psqlPath,
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--username=${dbConfig.username}`,
      `--dbname=${dbConfig.name}`,
      '--no-password',
      '--quiet',
      '--tuples-only',
      '--command',
    ];

    try {
      // Get PostgreSQL version
      const versionCmd = [...queryCommand, 'SELECT version();'].join(' ');
      const { stdout: versionOut } = await execAsync(versionCmd, { env });
      const version = versionOut.split('\n')[0]?.trim() || 'Unknown';

      // Get table count
      const tableCountCmd = [
        ...queryCommand,
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';",
      ].join(' ');
      const { stdout: tableCountOut } = await execAsync(tableCountCmd, { env });
      const tableCount = parseInt(tableCountOut.trim()) || 0;

      // Get database size
      const sizeCmd = [
        ...queryCommand,
        "SELECT pg_size_pretty(pg_database_size(current_database()));",
      ].join(' ');
      const { stdout: sizeOut } = await execAsync(sizeCmd, { env });
      const size = sizeOut.trim() || '0 bytes';

      return {
        version,
        tableCount,
        size,
      };
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Failed to get database info: ${err.message}`);
      return {
        version: 'Error',
        tableCount: 0,
        size: 'Error',
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    const dbConfig = this.getDatabaseConfig();
    const psqlPath = `${BACKUP_CONFIG.dbClientPath}/psql`;
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };

    const command = [
      psqlPath,
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--username=${dbConfig.username}`,
      `--dbname=${dbConfig.name}`,
      '--no-password',
      '--quiet',
      '--command',
      'SELECT 1;',
    ].join(' ');

    try {
      await execAsync(command, { env, timeout: 10000 });
      return true;
    } catch (error) {
        const err = error as Error;
      this.logger.error(`Database connection failed: ${err.message}`);
      return false;
    }
  }

  private compressBuffer(buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(buffer, { level: BACKUP_CONFIG.compressionLevel }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  private decompressBuffer(buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(buffer, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }
}