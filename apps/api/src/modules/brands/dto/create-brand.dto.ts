import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  name!: string;

  @IsObject()
  @IsOptional()
  nameI18n?: Record<string, string>;

  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
