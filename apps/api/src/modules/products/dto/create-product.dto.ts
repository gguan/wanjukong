import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsObject,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, SaleType } from '@prisma/client';

class DefaultVariantDto {
  @IsString()
  name!: string;

  @IsObject()
  @IsOptional()
  nameI18n?: Record<string, string>;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  manufacturerSku?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsObject()
  @IsOptional()
  subtitleI18n?: Record<string, string>;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  usdPriceCents?: number;

  @IsInt()
  @Min(0)
  stock!: number;
}

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsObject()
  @IsOptional()
  nameI18n?: Record<string, string>;

  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  scale?: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  brandId!: string;

  @IsString()
  categoryId!: string;

  @IsEnum(SaleType)
  @IsOptional()
  saleType?: SaleType;

  @IsDateString()
  @IsOptional()
  preorderStartAt?: string;

  @IsDateString()
  @IsOptional()
  preorderEndAt?: string;

  @IsDateString()
  @IsOptional()
  estimatedShipAt?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  depositCents?: number;

  @ValidateNested()
  @Type(() => DefaultVariantDto)
  defaultVariant!: DefaultVariantDto;
}
