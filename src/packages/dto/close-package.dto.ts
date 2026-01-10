// close-package.dto.ts
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PackageStatusEnum } from '../../common/enums/package-status.enum';

export class ClosePackageDto {
  @IsEnum(PackageStatusEnum)
  status!: PackageStatusEnum;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
