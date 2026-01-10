import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';
import { PaymentModeEnum } from '../common/enums/payment-mode.enum';

@Entity('payments')

export class Payment extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  patientId!: string;

  @Column({ type: 'uuid', nullable: false })
  packageId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amountPaid!: number;

  @Column({
    type: 'enum',
    enum: PaymentModeEnum,
    nullable: false,
  })
  paymentMode!: PaymentModeEnum;

  @Column({ type: 'date', nullable: false })
  paymentDate!: Date;

  @Column({ type: 'uuid', nullable: false })
  createdBy!: string;
}