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

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;

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
}
