import { IsUUID, IsOptional } from 'class-validator';

export class ListPaymentsQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  packageId?: string;
}