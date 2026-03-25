import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, SaleType } from '@prisma/client';

class DefaultVariantDto {
  @IsString()
  name!: string;

  @IsString()
  sku!: string;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsInt()
  @Min(0)
  stock!: number;
}

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

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

  @ValidateNested()
  @Type(() => DefaultVariantDto)
  defaultVariant!: DefaultVariantDto;
}
