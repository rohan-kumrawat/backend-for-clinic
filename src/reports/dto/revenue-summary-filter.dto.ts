import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { DateRangeFilterDto } from './date-range-filter.dto';
import { PaymentModeEnum } from '../../common/enums/payment-mode.enum';

export class RevenueSummaryFilterDto extends DateRangeFilterDto {
  @IsOptional()
  @IsEnum(PaymentModeEnum)
  paymentMode?: PaymentModeEnum;

  @IsDateString()
  dateFrom!: string;

}