import { IsOptional, IsDateString } from 'class-validator';

export class DateRangeFilterDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}