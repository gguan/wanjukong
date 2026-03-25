import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { ProductStatus, AvailabilityType, SaleType } from '@prisma/client';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  scale?: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsEnum(AvailabilityType)
  @IsOptional()
  availability?: AvailabilityType;

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
}
