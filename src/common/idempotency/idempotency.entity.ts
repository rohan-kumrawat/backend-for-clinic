import {
  Entity,
  Column,
  Index,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from '../base/base.entity';
import { IdempotencyStatus, HttpMethod } from './idempotency.types';

@Entity('idempotency_keys')
@Index('IDX_IDEMPOTENCY_KEY_METHOD', ['idempotencyKey', 'method'], { unique: true })
@Index('IDX_IDEMPOTENCY_EXPIRES', ['expiresAt'])
export class IdempotencyKey extends BaseEntity {

  @Column({ type: 'varchar', length: 100, nullable: false })
  idempotencyKey!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: false })
  endpoint!: string;

  @Column({
    type: 'enum',
    enum: HttpMethod,
    nullable: false,
  })
  method!: HttpMethod;

  @Column({ type: 'varchar', length: 64, nullable: false })
  requestHash!: string;

  @Column({ type: 'jsonb', nullable: true })
  requestParams!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  requestBody!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  responseBody!: Record<string, any> | null;

  @Column({ type: 'integer', nullable: true })
  responseStatus!: number | null;

  @Column({
    type: 'enum',
    enum: IdempotencyStatus,
    default: IdempotencyStatus.PENDING,
    nullable: false,
  })
  status!: IdempotencyStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lockedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: false })
  expiresAt!: Date;

  @BeforeInsert()
  setExpiry() {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  isLocked(): boolean {
    if (!this.lockedAt) return false;
    return Date.now() - this.lockedAt.getTime() < 30_000;
  }
}
