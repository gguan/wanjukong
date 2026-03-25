import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  versionCode?: string;

  @IsString()
  sku!: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  specSummary?: string;

  @IsString()
  @IsOptional()
  specifications?: string;

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
}
