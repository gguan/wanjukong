import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;

  /** Browser locale — normalized to en/ja/zh-CN/zh-TW server-side. */
  @IsString()
  @IsOptional()
  @MaxLength(35)
  locale?: string;
}
