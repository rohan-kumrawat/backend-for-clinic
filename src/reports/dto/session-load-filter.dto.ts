import { IsDateString } from 'class-validator';

export class SessionLoadFilterDto {
  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;
}