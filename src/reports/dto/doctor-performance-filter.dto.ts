import { IsOptional, IsUUID } from 'class-validator';
import { DateRangeFilterDto } from './date-range-filter.dto';

export class DoctorPerformanceFilterDto extends DateRangeFilterDto {
  @IsOptional()
  @IsUUID()
  doctorId?: string;

}


