import { IsOptional, IsNumber, Min, IsString, IsEnum, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PatientStatusEnum } from '../../common/enums/patient-status.enum';

export class ListPatientsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(PatientStatusEnum)
  status?: PatientStatusEnum;
}