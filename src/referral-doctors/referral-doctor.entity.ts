import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';

@Entity('referral_doctors')
export class ReferralDoctor extends BaseEntity {

  @Column({ type: 'varchar', length: 100, nullable: false })
  @Index({ unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  specialization!: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  clinicName!: string | null;
}
