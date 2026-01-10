import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { SECURITY_CONSTANTS } from '../../common/constants/security.constants';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}