import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
  Min,
} from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  name!: string;

  @IsObject()
  @IsOptional()
  nameI18n?: Record<string, string>;

  @IsString()
  @IsOptional()
  versionCode?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  manufacturerSku?: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  usdPriceCents?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsObject()
  @IsOptional()
  subtitleI18n?: Record<string, string>;

  @IsString()
  @IsOptional()
  specSummary?: string;

  @IsObject()
  @IsOptional()
  specSummaryI18n?: Record<string, string>;

  @IsString()
  @IsOptional()
  specifications?: string;

  @IsObject()
  @IsOptional()
  specificationsI18n?: Record<string, string>;

  @IsInt()
  @Min(0)
  @IsOptional()
  weightGrams?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  /**
   * UploadFile id returned by /admin/uploads/register-temp. Sending this
   * tells the variant service to mark the upload as USED so the
   * temp-upload cleanup cron doesn't reap the COS object after 24h.
   */
  @IsString()
  @IsOptional()
  coverImageUploadFileId?: string;
}
