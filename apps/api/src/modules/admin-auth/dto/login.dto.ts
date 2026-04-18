import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  /** Server-issued captcha challenge id (from GET /admin/auth/captcha) */
  @IsString()
  captchaId!: string;

  /** User-typed answer; validated case-insensitively, single-use */
  @IsString()
  @MinLength(1)
  captchaAnswer!: string;
}
