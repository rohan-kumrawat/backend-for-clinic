import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AdminSetupDto {
  @IsEmail()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  mobile!: string;
}
