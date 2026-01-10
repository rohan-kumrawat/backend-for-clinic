import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';

export enum BackupStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export enum BackupType {
  FULL = 'FULL',
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
}

@Entity('backup_logs')
@Index('IDX_BACKUP_STATUS', ['status', 'isDeleted'])
@Index('IDX_BACKUP_CREATED_AT', ['createdAt'])
export class Backup extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  filename!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  filePath!: string;

  @Column({ type: 'bigint', nullable: false })
  fileSize!: number;

  @Column({ type: 'varchar', length: 64, nullable: false })
  checksum!: string;

  @Column({
    type: 'enum',
    enum: BackupType,
    default: BackupType.FULL,
    nullable: false,
  })
  type!: BackupType;

  @Column({
    type: 'enum',
    enum: BackupStatus,
    default: BackupStatus.PENDING,
    nullable: false,
  })
  status!: BackupStatus;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  databaseVersion!: string | null;

  @Column({ type: 'integer', nullable: false })
  tableCount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  backupDuration!: number | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;
}