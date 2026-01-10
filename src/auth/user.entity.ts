import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';
import { RoleEnum } from '../common/enums/role.enum';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password!: string;

  @Column({
    type: 'enum',
    enum: RoleEnum,
    default: RoleEnum.RECEPTIONIST,
    nullable: false,
  })
  role!: RoleEnum;

  @Column({ type: 'boolean', default: true, nullable: false })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  mobile!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  email!: string | null;

  @Column({ type: 'integer', default: 0, nullable: false })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  accountLockedUntil!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetTokenExpiresAt!: Date | null;
}