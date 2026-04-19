import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterCustomerDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsOptional()
  name?: string;

  /** Browser locale — normalized to en/ja/zh-CN/zh-TW server-side. */
  @IsString()
  @IsOptional()
  @MaxLength(35)
  locale?: string;
}
