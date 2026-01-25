import { IsString, IsOptional, Length } from 'class-validator';

export class CreateReferralDoctorDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  specialization?: string;

  @IsOptional()
  @IsString()
  @Length(7, 15)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  clinicName?: string;
}
