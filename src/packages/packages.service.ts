import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Package } from './package.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { ListPackagesQueryDto } from './dto/list-packages-query.dto';
import { PackageClosedEvent } from 'src/common/events/package-closed.event';
import { PackageStatusEnum } from '../common/enums/package-status.enum';
import { EVENT_PACKAGE_CLOSED } from 'src/common/events/event-names';
import { PatientsService } from 'src/patients/patients.service';
import { Doctor } from 'src/doctors/doctor.entity';

export interface PackageListResponse {
  data: Package[];
}

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,

    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,

    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly patientsService: PatientsService,
  ) { }

  //✅ CREATE PACKAGE → PATIENT ACTIVE
  async createPackage(
    dto: CreatePackageDto,
    createdBy: string,
  ): Promise<Package> {
    if (!createdBy) {
      throw new BadRequestException('Invalid user context');
    }

    await this.validateNoActivePackageForPatient(dto.patientId);
    this.validatePackageAmounts(dto);

    const doctor = await this.doctorRepository.findOne({
      where: { id: dto.assignedDoctorId, isDeleted: false },
    });

    if (!doctor) {
      throw new NotFoundException('Assigned doctor not found');
    }

    const pkg = this.packageRepository.create({
      ...dto,
      assignedDoctor: doctor,
      status: PackageStatusEnum.ACTIVE,
      releasedSessions: 0,
      consumedSessions: 0,
    });

    pkg.createdBy = createdBy;

    try {
      const savedPackage = await this.packageRepository.save(pkg);

      // ✅ patient ACTIVE
      await this.patientsService.markActive(dto.patientId);

      return savedPackage;
    } catch (error) {
      console.error('Error creating package:', error);
      throw error;
    }
  }

  // ✅ CLOSE PACKAGE → PATIENT INACTIVE
  async closePackage(
  packageId: string,
  status: PackageStatusEnum,
  remark?: string,
): Promise<Package> {
  if (
    ![
      PackageStatusEnum.PAUSED,
      PackageStatusEnum.CLOSED_EARLY,
      PackageStatusEnum.CANCELLED,
      PackageStatusEnum.COMPLETED,
    ].includes(status)
  ) {
    throw new BadRequestException('Invalid package close status');
  }

  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const pkg = await queryRunner.manager.findOne(Package, {
      where: { id: packageId, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    if (pkg.status !== PackageStatusEnum.ACTIVE) {
      throw new BadRequestException('Package is not active');
    }

    pkg.status = status;
    pkg.closeRemark = remark || null;
    await queryRunner.manager.save(pkg);

    await queryRunner.commitTransaction();

    // 🔥 Patient inactive only for FINAL closures
    if (
      [
        PackageStatusEnum.COMPLETED,
        PackageStatusEnum.CLOSED_EARLY,
        PackageStatusEnum.CANCELLED,
      ].includes(status)
    ) {
      await this.patientsService.markInactive(pkg.patientId);
    }

    this.eventEmitter.emit(
      EVENT_PACKAGE_CLOSED,
      new PackageClosedEvent(packageId),
    );

    return pkg;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}


  async getPackages(query: ListPackagesQueryDto): Promise<PackageListResponse> {
    const where: FindOptionsWhere<Package> = {
      patientId: query.patientId,
      isDeleted: false,
    };

    if (query.status) {
      where.status = query.status;
    }

    try {
      const data = await this.packageRepository.find({
        where,
        relations: { assignedDoctor: true },
        order: { createdAt: 'DESC' },
      });

      return { data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch packages');
    }
  }

  private async validateNoActivePackageForPatient(patientId: string): Promise<void> {
    const existingActivePackage = await this.packageRepository.findOne({
      where: {
        patientId,
        status: PackageStatusEnum.ACTIVE,
        isDeleted: false,
      },
    });

    if (existingActivePackage) {
      throw new BadRequestException('Patient already has an active package');
    }
  }

  private validatePackageAmounts(dto: CreatePackageDto): void {
    const calculatedTotal = dto.originalAmount - dto.discountAmount;
    const calculatedPerSession = calculatedTotal / dto.totalSessions;

    if (Math.abs(calculatedTotal - dto.totalAmount) > 0.01) {
      throw new BadRequestException(
        `Total amount (${dto.totalAmount}) must equal original amount (${dto.originalAmount}) minus discount amount (${dto.discountAmount}) = ${calculatedTotal}`,
      );
    }

    if (Math.abs(calculatedPerSession - dto.perSessionAmount) > 0.01) {
      throw new BadRequestException(
        `Per session amount (${dto.perSessionAmount}) must equal total amount (${dto.totalAmount}) divided by total sessions (${dto.totalSessions}) = ${calculatedPerSession.toFixed(2)}`,
      );
    }
  }
}
