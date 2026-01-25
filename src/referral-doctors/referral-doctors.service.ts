import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralDoctor } from './referral-doctor.entity';
import { CreateReferralDoctorDto } from './dto/create-referral-doctor.dto';
import { UpdateReferralDoctorDto } from './dto/update-referral-doctor.dto';
import { ListReferralDoctorsQueryDto } from './dto/list-referral-doctor-query.dto';

@Injectable()
export class ReferralDoctorsService {
  constructor(
    @InjectRepository(ReferralDoctor)
    private readonly referralDoctorRepository: Repository<ReferralDoctor>,
  ) {}

  async create(dto: CreateReferralDoctorDto): Promise<ReferralDoctor> {
    const doctor = this.referralDoctorRepository.create({
      ...dto,
    });

    try {
      return await this.referralDoctorRepository.save(doctor);
    } catch (e) {
      throw new InternalServerErrorException('Failed to create referral doctor');
    }
  }

  async list(query: ListReferralDoctorsQueryDto) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.referralDoctorRepository.createQueryBuilder('rd');
    qb.where('rd.isDeleted = false');

    if (search) {
      qb.andWhere(
        '(rd.name ILIKE :search OR rd.clinicName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('rd.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { page, limit, total },
    };
  }

  async update(id: string, dto: UpdateReferralDoctorDto): Promise<ReferralDoctor> {
    const doctor = await this.referralDoctorRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!doctor) {
      throw new NotFoundException('Referral doctor not found');
    }

    Object.assign(doctor, dto);
    return this.referralDoctorRepository.save(doctor);
  }

  async softDelete(id: string) {
    const doctor = await this.referralDoctorRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!doctor) {
      throw new NotFoundException('Referral doctor not found');
    }

    doctor.isDeleted = true;
    await this.referralDoctorRepository.save(doctor);

    return { message: 'Referral doctor deleted successfully' };
  }
}
