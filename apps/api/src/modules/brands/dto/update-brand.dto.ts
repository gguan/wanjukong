import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateBrandDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  nameI18n?: Record<string, string>;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  /** See CreateBrandDto.logoUploadFileId. */
  @IsString()
  @IsOptional()
  logoUploadFileId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
