import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { ProductStatus, SaleType } from '@prisma/client';

export class UpdateProductDto {
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
  scale?: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsEnum(SaleType)
  @IsOptional()
  saleType?: SaleType;

  @IsDateString()
  @IsOptional()
  preorderStartAt?: string | null;

  @IsDateString()
  @IsOptional()
  preorderEndAt?: string | null;

  @IsDateString()
  @IsOptional()
  estimatedShipAt?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  depositCents?: number | null;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsInt()
  @IsOptional()
  featuredSort?: number;
}
