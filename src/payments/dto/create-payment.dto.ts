import {
  IsUUID,
  IsNumber,
  Min,
  IsEnum,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentModeEnum } from '../../common/enums/payment-mode.enum';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @IsUUID()
  @IsNotEmpty()
  packageId!: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amountPaid!: number;

  @IsEnum(PaymentModeEnum)
  paymentMode!: PaymentModeEnum;

  @IsDateString()
  @IsNotEmpty()
  paymentDate!: string;
}