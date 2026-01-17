import {
  IsString,
  IsNumber,
  Min,
  IsUUID,
  IsNotEmpty,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePackageDto {
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @IsString()
  @IsNotEmpty()
  visitType!: string;

  @IsString()
  @IsNotEmpty()
  packageName!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  originalAmount!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountAmount!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalAmount!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  totalSessions!: number;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  perSessionAmount!: number;
  
  @IsUUID()
  @IsNotEmpty()
  assignedDoctorId!: string;
}