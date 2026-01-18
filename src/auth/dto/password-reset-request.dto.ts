import { IsString, IsNotEmpty } from 'class-validator';

export class PasswordResetRequestDto {
  @IsString()
  @IsNotEmpty()
  email!: string;
}