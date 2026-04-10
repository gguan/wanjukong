import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  /** 腾讯云验证码 ticket */
  @IsString()
  @IsOptional()
  captchaTicket?: string;

  /** 腾讯云验证码 randstr */
  @IsString()
  @IsOptional()
  captchaRandstr?: string;
}
