import { IsUUID, IsString, MinLength } from 'class-validator';

export class ReceptionResetPasswordDto {

  @IsUUID()
  receptionistId!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
