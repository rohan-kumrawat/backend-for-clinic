import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';
import { FinancialStatusEnum } from '../common/enums/financial-status.enum';

@Entity('financial_summaries')

export class FinancialSummary extends BaseEntity {

  @Index()
  @Column({ type: 'uuid', nullable: false })
  patientId!: string;

  @Column({ type: 'uuid', nullable: false, unique: true })
  packageId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
  totalPackageAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false, default: 0 })
  totalPaidAmount!: number;

  @Column({ type: 'integer', nullable: false })
  totalSessions!: number;

  @Column({ type: 'integer', nullable: false, default: 0 })
  consumedSessions!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  perSessionAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false, default: 0 })
  remainingPayableAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false, default: 0 })
  carryForwardAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false, default: 0 })
  overPaidAmount!: number;

  @Column({ type: 'integer', nullable: false, default: 0 })
  releasedSessions!: number;


  @Column({
    type: 'enum',
    enum: FinancialStatusEnum,
    default: FinancialStatusEnum.DUE,
    nullable: false,
  })
  status!: FinancialStatusEnum;
}