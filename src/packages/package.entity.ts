import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';
import { PackageStatusEnum } from '../common/enums/package-status.enum';
import { Doctor } from '../doctors/doctor.entity';

@Entity('packages')
export class Package extends BaseEntity {
  
  @Index()
  @Column({ type: 'uuid', nullable: false })
  patientId!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  visitType!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  packageName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  originalAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  totalAmount!: number;

  @Column({ type: 'integer', nullable: false })
  totalSessions!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  perSessionAmount!: number;

  @Column({ type: 'integer', default: 0, nullable: false })
  releasedSessions!: number;

  @Column({ type: 'integer', default: 0, nullable: false })
  consumedSessions!: number;

  @Column({
    type: 'enum',
    enum: PackageStatusEnum,
    default: PackageStatusEnum.ACTIVE,
    nullable: false,
  })
  status!: PackageStatusEnum;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  carryForwardAmount!: number;

  @ManyToOne(() => Doctor, { nullable: false })
  @JoinColumn({ name: 'assignedDoctorId' })
  assignedDoctor!: Doctor;

  @Column({ type: 'uuid', nullable:false })
  assignedDoctorId!: string;

  
  @Column({ type: 'varchar', length: 500, nullable: true })
  closeRemark?: string | null;

  @Column({ type: 'uuid', nullable: false })
  createdBy!: string;


}