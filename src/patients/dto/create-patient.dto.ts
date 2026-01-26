import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsOptional,
  Matches,
  Length,
  IsBoolean,
} from 'class-validator';
import { GenderEnum } from '../../common/enums/gender.enum';

export class CreatePatientDto {
  @IsString()
  @Length(1, 50)
  registrationNumber!: string;

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsNumber()
  @Min(0)
  @Max(120)
  age!: number;

  @IsEnum(GenderEnum)
  gender!: GenderEnum;

  @IsString()
  @Matches(/^[6-9]\d{9}$/,
    {
      message: 'Mobile number must be a valid Indian mobile number',
    })
  mobile!: string;

  @IsOptional()
  @IsString()
  referredDoctor?: string;

  @IsOptional()
  @IsBoolean()
  isOldPatient?: boolean;


}