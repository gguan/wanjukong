import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  token!: string;

  @IsString()
  @IsOptional()
  @MaxLength(35)
  locale?: string;
}
