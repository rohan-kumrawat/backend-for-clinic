import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';
import { RoleEnum } from '../common/enums/role.enum';

@Entity('user_sessions')
@Index('IDX_USER_SESSION_USER', ['userId', 'isActive'])
@Index('IDX_USER_SESSION_JWT', ['jwtId'])
@Index('IDX_USER_SESSION_EXPIRES', ['expiresAt'])
export class UserSession extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  userId!: string;

  @Column({
    type: 'enum',
    enum: RoleEnum,
    nullable: false,
  })
  role!: RoleEnum;

  @Column({ type: 'varchar', length: 100, nullable: false })
  jwtId!: string;

  @Column({ type: 'varchar', length: 45, nullable: false })
  ipAddress!: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'timestamptz', nullable: false })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'boolean', default: true, nullable: false })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshTokenHash?: string;

  @Column({ type: 'timestamptz', nullable: true })
  refreshTokenExpiresAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceInfo!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  location!: string | null;
}