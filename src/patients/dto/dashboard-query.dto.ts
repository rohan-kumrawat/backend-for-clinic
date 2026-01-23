import { IsOptional, IsUUID, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FinancialStatusEnum } from '../../common/enums/financial-status.enum';
import { SessionShiftEnum } from '../../common/enums/session-shift.enum';

export class PatientDashboardQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsEnum(FinancialStatusEnum)
  financialStatus?: FinancialStatusEnum;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  releasedSessionsLt?: number;

  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit: number = 20;
}
