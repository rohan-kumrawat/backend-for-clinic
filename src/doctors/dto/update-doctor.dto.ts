import { IsOptional, IsString, Length, IsEnum } from 'class-validator';
import { DoctorStatusEnum } from '../../common/enums/doctor-status.enum';

export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  specialization?: string;

  @IsOptional()
  @IsEnum(DoctorStatusEnum)
  status?: DoctorStatusEnum;
}
