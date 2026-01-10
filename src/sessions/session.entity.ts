import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';
import { SessionShiftEnum } from '../common/enums/session-shift.enum';

@Entity('sessions')
@Index('IDX_SESSION_PATIENT_DATE', ['patientId', 'sessionDate'])
@Index('IDX_SESSION_DOCTOR_DATE', ['doctorId', 'sessionDate'])
export class Session extends BaseEntity {

  @Index()
  @Column({ type: 'uuid', nullable: false })
  patientId!: string;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  packageId!: string;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  doctorId!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  visitType!: string;

  @Column({
    type: 'enum',
    enum: SessionShiftEnum,
    nullable: false,
  })
  shift!: SessionShiftEnum;

  @Column({ type: 'date', nullable: false })
  sessionDate!: Date;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @Column({ type: 'boolean', default: false, nullable: false })
  isFreeSession!: boolean;

  @Column({ type: 'uuid', nullable: false })
  createdBy!: string;
}