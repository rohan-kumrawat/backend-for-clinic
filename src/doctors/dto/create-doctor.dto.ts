import { IsString, IsOptional, Length } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  specialization?: string;
}