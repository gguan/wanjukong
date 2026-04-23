import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
  Min,
} from 'class-validator';

export class UpdateProductVariantDto {
  @IsString()
  @IsOptional()
  name?: string;

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
  @IsOptional()
  priceCents?: number;

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

  // Nullable so the admin can explicitly clear the variant cover.
  @IsString()
  @IsOptional()
  coverImageUrl?: string | null;

  /** See CreateProductVariantDto.coverImageUploadFileId. */
  @IsString()
  @IsOptional()
  coverImageUploadFileId?: string;
}
