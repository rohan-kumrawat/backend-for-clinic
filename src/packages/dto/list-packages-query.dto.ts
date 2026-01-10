import { IsUUID, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { PackageStatusEnum } from '../../common/enums/package-status.enum';

export class ListPackagesQueryDto {
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @IsOptional()
  @IsEnum(PackageStatusEnum)
  status?: PackageStatusEnum;
}