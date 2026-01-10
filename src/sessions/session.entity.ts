import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';
import { SessionShiftEnum } from '../common/enums/session-shift.enum';

@Entity('sessions')

export class Session extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  patientId!: string;

  @Column({ type: 'uuid', nullable: false })
  packageId!: string;

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