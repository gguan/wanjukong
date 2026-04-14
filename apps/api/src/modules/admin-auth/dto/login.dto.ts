import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  /** TCaptcha ticket */
  @IsString()
  @IsOptional()
  captchaTicket?: string;

  /** TCaptcha randstr */
  @IsString()
  @IsOptional()
  captchaRandstr?: string;
}
