import { IsString, IsInt, IsOptional, IsObject } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  nameI18n?: Record<string, string>;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
