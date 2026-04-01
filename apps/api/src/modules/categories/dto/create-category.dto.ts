import { IsString, IsInt, IsOptional, IsObject } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsObject()
  @IsOptional()
  nameI18n?: Record<string, string>;

  @IsString()
  slug!: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
