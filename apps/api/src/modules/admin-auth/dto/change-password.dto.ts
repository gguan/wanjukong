import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  oldPassword!: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  newPassword!: string;
}
