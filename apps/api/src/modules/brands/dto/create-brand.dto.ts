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

  /**
   * UploadFile id returned by /admin/uploads/register-temp. When set, the
   * brand service marks the corresponding upload as USED so the cleanup
   * cron doesn't reap the COS object 24h after upload.
   */
  @IsString()
  @IsOptional()
  logoUploadFileId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
