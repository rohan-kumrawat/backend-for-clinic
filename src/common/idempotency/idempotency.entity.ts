import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { IdempotencyStatus, HttpMethod } from './idempotency.types';

@Entity('idempotency_keys')
@Index(['idempotencyKey'], { unique: true })
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  idempotencyKey!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Column()
  endpoint!: string;

  @Column({ type: 'varchar' })
  method!: HttpMethod;

  @Column()
  requestHash!: string;

  @Column({ type: 'jsonb', nullable: true })
  requestParams!: any;

  @Column({ type: 'jsonb', nullable: true })
  requestBody!: any;

  @Column({ type: 'jsonb', nullable: true })
  responseBody!: any;

  @Column({ type: 'int', nullable: true })
  responseStatus!: number | null;

  @Column({ default: 'pending' })
  status!: IdempotencyStatus;

  @Column({ type: 'timestamp', nullable: true })
  lockedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  setExpiry() {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  isLocked(): boolean {
    if (!this.lockedAt) return false;
    return Date.now() - this.lockedAt.getTime() < 30_000;
  }
}
