import { IsUUID, IsOptional } from 'class-validator';

export class ListSessionsQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  packageId?: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;
}