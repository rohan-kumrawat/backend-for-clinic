import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { SECURITY_CONSTANTS } from '../../common/constants/security.constants';

export class PasswordResetConfirmDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}