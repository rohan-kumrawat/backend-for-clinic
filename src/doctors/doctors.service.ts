import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './doctor.entity';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';
import { DoctorStatusEnum } from '../common/enums/doctor-status.enum';

export interface DoctorListResponse {
  data: Doctor[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {}

  async createDoctor(dto: CreateDoctorDto): Promise<Doctor> {
    const doctor = this.doctorRepository.create({
      name: dto.name,
      specialization: dto.specialization ?? null,
      status: DoctorStatusEnum.ACTIVE,
    });

    try {
      return await this.doctorRepository.save(doctor);
    } catch {
      throw new InternalServerErrorException('Failed to create doctor');
    }
  }

  async getDoctors(query: ListDoctorsQueryDto): Promise<DoctorListResponse> {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.doctorRepository.createQueryBuilder('doctor');
    qb.where('doctor.isDeleted = false');

    if (status) {
      qb.andWhere('doctor.status = :status', { status });
    }

    if (search) {
      qb.andWhere('doctor.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('doctor.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, meta: { page, limit, total } };
  }

  async updateDoctor(id: string, dto: UpdateDoctorDto): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    Object.assign(doctor, dto);
    return this.doctorRepository.save(doctor);
  }

  async softDeleteDoctor(id: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    doctor.isDeleted = true;
    await this.doctorRepository.save(doctor);

    return { message: 'Doctor deleted successfully' };
  }
}
