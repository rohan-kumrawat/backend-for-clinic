import { IsUUID } from 'class-validator';

export class GenerateReceiptDto {
  @IsUUID()
  paymentId!: string;
}