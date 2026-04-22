import { AdminRole } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12, { message: '密码长度至少为 12 位' })
  password!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(AdminRole)
  role!: AdminRole;
}
