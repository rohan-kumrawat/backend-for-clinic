// src/patients/entities/patient-document.entity.ts
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';
import { Patient } from './patient.entity';

@Entity('patient_documents')
@Index('IDX_PATIENT_DOCUMENT_PATIENT', ['patientId'])
export class PatientDocument extends BaseEntity {
  @Column({ type: 'uuid' })
  patientId!: string;

  @ManyToOne(() => Patient, (patient) => patient.documents, {
  onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patientId' })
  patient!: Patient;

  @Column({ type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ type: 'varchar', length: 100 })
  fileType!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  cloudinaryPublicId!: string;

  @Column({ type: 'varchar', length: 500 })
  fileUrl!: string;

  @Column({ type: 'int' })
  fileSize!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  documentType!: string | null;

  @CreateDateColumn()
  uploadedAt!: Date;
}
