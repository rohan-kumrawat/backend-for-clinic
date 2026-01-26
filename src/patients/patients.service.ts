import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { PatientStatusEnum } from '../common/enums/patient-status.enum';
import { PatientDashboardQueryDto } from './dto/dashboard-query.dto';
import { PatientDocumentService } from './patient-document.service';
import { UpdatePatientDto } from './dto/update-patient.dto';

export interface PatientListResponse {
  data: Patient[];
  meta: { page: number; limit: number; total: number };
}

@Injectable()
export class PatientsService {
  dataSource: any;
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,

    private readonly patientDocumentService: PatientDocumentService,
  ) { }

  async createPatient(
    dto: CreatePatientDto,
    files?: Express.Multer.File[],
  ): Promise<Patient> {

    await this.checkDuplicateRegistrationNumber(dto.registrationNumber);

    const queryRunner = this.patientRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const patient = queryRunner.manager.create(Patient, {
        ...dto,
        status: dto.isOldPatient
          ? PatientStatusEnum.INACTIVE
          : PatientStatusEnum.ACTIVE,
        isOldPatient: dto.isOldPatient ?? false,  
        referredDoctor: dto.referredDoctor || null,
      });

      const savedPatient = await queryRunner.manager.save(patient);

      if (files && files.length > 0) {
        await this.patientDocumentService.createDocuments(
          queryRunner.manager,
          savedPatient.id,
          files,
        );
      }

      await queryRunner.commitTransaction();
      return savedPatient;

    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }


  async getPatientById(id: string): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async getPatients(query: ListPatientsQueryDto): Promise<PatientListResponse> {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;
    const qb = this.patientRepository.createQueryBuilder('patient');
    qb.where('patient.isDeleted = false');

    if (status) qb.andWhere('patient.status = :status', { status });
    if (search) {
      qb.andWhere(
        '(patient.name ILIKE :search OR patient.registrationNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('patient.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { page, limit, total } };
  }

  async getActivePatients(
    query: ListPatientsQueryDto,
  ): Promise<PatientListResponse> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;
    const qb = this.patientRepository.createQueryBuilder('patient');
    qb.where('patient.isDeleted = false').andWhere(
      'patient.status = :status',
      { status: PatientStatusEnum.ACTIVE },
    );

    if (search) {
      qb.andWhere(
        '(patient.name ILIKE :search OR patient.registrationNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('patient.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { page, limit, total } };
  }

  async getDashboardPatients(
    query: PatientDashboardQueryDto,
    onlyActive: boolean,
  ) {
    const {
      page = 1,
      limit = 10,
      search,
      doctorId,
      financialStatus,
      releasedSessionsLt,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.patientRepository
      .createQueryBuilder('p')
      .leftJoin(
        'packages',
        'pkg',
        'pkg.patientId = p.id AND pkg.isDeleted = false AND pkg.status = :activeStatus',
        { activeStatus: 'ACTIVE' },
      )
      .leftJoin(
        'financial_summaries',
        'fs',
        'fs.packageId = pkg.id AND fs.isDeleted = false',
      )
      .leftJoin('doctors', 'd', 'd.id = pkg."assignedDoctorId"')
      .where('p.isDeleted = false');

    if (onlyActive) qb.andWhere('p.status = :pActive', { pActive: PatientStatusEnum.ACTIVE });
    if (search) {
      qb.andWhere(
        '(p.name ILIKE :search OR p.registrationNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (doctorId) qb.andWhere('pkg."assignedDoctorId" = :doctorId', { doctorId });
    if (financialStatus) qb.andWhere('fs.status = :financialStatus', { financialStatus });
    if (releasedSessionsLt !== undefined) {
      qb.andWhere('pkg.releasedSessions < :releasedSessionsLt', { releasedSessionsLt });
    }

    qb.select([
      'p.id AS "patientId"',
      'p.registrationNumber AS "registrationNumber"',
      'p.name AS "patientName"',
      'pkg."assignedDoctorId" AS "doctorId"',
      'd.name AS "doctorName"',
      'pkg.id AS "packageId"',
      'pkg.status AS "packageStatus"',

      'COALESCE(fs.totalSessions, pkg.totalSessions) AS "totalSessions"',
      'COALESCE(fs.consumedSessions, 0) AS "consumedSessions"',
      '(COALESCE(fs.totalSessions, pkg.totalSessions) - COALESCE(fs.consumedSessions, 0)) AS "remainingSessions"',
      'COALESCE(fs.releasedSessions, pkg.releasedSessions) AS "releasedSessions"',
      'CASE WHEN COALESCE(fs.releasedSessions, 0) < 0 THEN ABS(fs.releasedSessions) ELSE 0 END AS "overConsumedSessions"',

      'COALESCE(fs."totalPackageAmount", pkg.totalAmount)::float AS "totalPackageAmount"',
      'COALESCE(fs."totalPaidAmount", 0)::float AS "totalPaidAmount"',
      '(COALESCE(fs."totalPackageAmount", pkg.totalAmount) - COALESCE(fs."totalPaidAmount", 0))::float AS "remainingPayableAmount"',
      'COALESCE(fs.status, \'DUE\') AS "financialStatus"',
    ]);

    qb.orderBy('p.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await Promise.all([qb.getRawMany(), qb.getCount()]);

    return { data, meta: { page, limit, total } };
  }




  async updatePatientStatus(patientId: string, status: PatientStatusEnum) {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId, isDeleted: false },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    await this.patientRepository.update({ id: patientId }, { status });
    return { success: true };
  }

  async softDeletePatient(patientId: string): Promise<{ success: true }> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId, isDeleted: false },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    await this.patientRepository.update(
      { id: patientId },
      { isDeleted: true, status: PatientStatusEnum.INACTIVE },
    );
    return { success: true };
  }

  private async checkDuplicateRegistrationNumber(registrationNumber: string): Promise<void> {
    const existingPatient = await this.patientRepository.findOne({
      where: { registrationNumber, isDeleted: false },
    });
    if (existingPatient) {
      throw new ConflictException('A patient with this registration number already exists.');
    }
  }

  async markActive(patientId: string): Promise<void> {
    await this.patientRepository.update({ id: patientId }, { status: PatientStatusEnum.ACTIVE });
  }

  async markInactive(patientId: string): Promise<void> {
    await this.patientRepository.update({ id: patientId }, { status: PatientStatusEnum.INACTIVE });
  }
}