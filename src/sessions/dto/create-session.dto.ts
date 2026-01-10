import {
  IsUUID,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { SessionShiftEnum } from '../../common/enums/session-shift.enum';

export class CreateSessionDto {
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @IsUUID()
  @IsNotEmpty()
  packageId!: string;

  @IsUUID()
  @IsNotEmpty()
  doctorId!: string;

  @IsString()
  @IsNotEmpty()
  visitType!: string;

  @IsEnum(SessionShiftEnum)
  shift!: SessionShiftEnum;

  @IsDateString()
  @IsNotEmpty()
  sessionDate!: string;

  @IsOptional()
  @IsString()
  remarks?: string | null;

  @IsOptional()
  @IsBoolean()
  isFreeSession?: boolean;
}