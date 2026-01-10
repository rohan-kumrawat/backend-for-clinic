import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../base/base.entity';
import { RoleEnum } from '../enums/role.enum';

@Entity('audit_logs')
@Index('IDX_AUDIT_ENTITY', ['entity', 'entityId'])
@Index('IDX_AUDIT_ACTOR', ['actorId'])
@Index('IDX_AUDIT_CREATED_AT', ['createdAt'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  actorId!: string | null;

  @Column({
    type: 'enum',
    enum: RoleEnum,
    nullable: false,
  })
  actorRole!: RoleEnum;

  @Column({ type: 'varchar', length: 100, nullable: false })
  action!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  entity!: string;

  @Column({ type: 'uuid', nullable: true })
  entityId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  oldValue!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  newValue!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  requestData!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  responseData!: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  endpoint!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: false })
  method!: string;

  @Column({ type: 'integer', nullable: true })
  statusCode!: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage!: string | null;
}