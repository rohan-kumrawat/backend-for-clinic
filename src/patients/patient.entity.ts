import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/base/base.entity';
import { GenderEnum } from '../common/enums/gender.enum';
import { PatientStatusEnum } from '../common/enums/patient-status.enum';
import { PatientDocument } from './patient-document.entity';

@Entity('patients')
export class Patient extends BaseEntity {

  @Column
    ({
      type: 'varchar',
      length: 50,
      nullable: false,
      unique: true
    })
  registrationNumber!: string;

  @Column
    ({
      type: 'varchar',
      length: 100,
      nullable: false
    })
  name!: string;

  @Column
    ({
      type: 'integer',
      nullable: false
    })
  age!: number;

  @Column
    ({
      type: 'enum',
      enum: GenderEnum,
      nullable: false,
    })
  gender!: GenderEnum;

  @Column
    ({
      type: 'varchar',
      length: 15,
      nullable: false,
    })
  @Index({ unique: true })
  mobile!: string;

  @Column
    ({
      type: 'enum',
      enum: PatientStatusEnum,
      default: PatientStatusEnum.INACTIVE,
      nullable: false,
    })
  status!: PatientStatusEnum;

  @Column
    ({
      type: 'varchar',
      length: 100,
      nullable: true
    })
  referredDoctor!: string | null;

  @Column({
    name: 'is_old_patient',
    type: 'boolean',
    default: false,
  })
  isOldPatient!: boolean;


  @OneToMany(() => PatientDocument, (doc) => doc.patient)
  documents!: PatientDocument[];

}