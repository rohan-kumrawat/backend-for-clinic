import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Doctor } from './doctor.entity';
import { CreateDoctorDto } from './dto/create-doctor.dto';
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
    } catch (error) {
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

  return {
    data,
    meta: {
      page,
      limit,
      total,
    },
  };
}

}