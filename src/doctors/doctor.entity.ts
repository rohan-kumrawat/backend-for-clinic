import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';
import { DoctorStatusEnum } from '../common/enums/doctor-status.enum';

@Entity('doctors')
export class Doctor extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  specialization!: string | null;

  @Column({
    type: 'enum',
    enum: DoctorStatusEnum,
    default: DoctorStatusEnum.ACTIVE,
    nullable: false,
  })
  status!: DoctorStatusEnum;
}