import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(12, { message: '密码长度至少为 12 位' })
  newPassword!: string;
}
