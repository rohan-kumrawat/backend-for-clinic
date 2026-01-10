import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { GenderEnum } from '../../common/enums/gender.enum';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsEnum(GenderEnum)
  gender?: GenderEnum;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  referredDoctor?: string | null;
 
  // multipart ke liye string rahega
  @IsOptional()
  @IsString()
  @IsUUID('4', { each: true })
  deleteDocumentIds?: string[]; // Array of UUIDs
}