import { IsUUID, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateStatementDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}