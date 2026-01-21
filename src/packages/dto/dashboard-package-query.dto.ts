import { IsOptional, IsUUID, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PackageStatusEnum } from '../../common/enums/package-status.enum';
import { FinancialStatusEnum } from '../../common/enums/financial-status.enum';

export class DashboardPackageQueryDto {

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsEnum(PackageStatusEnum)
  status?: PackageStatusEnum;

  @IsOptional()
  @IsEnum(FinancialStatusEnum)
  financialStatus?: FinancialStatusEnum;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number = 20;
}
