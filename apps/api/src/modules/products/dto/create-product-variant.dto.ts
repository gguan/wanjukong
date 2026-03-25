import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { ProductStatus, AvailabilityType } from '@prisma/client';

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

  @IsEnum(AvailabilityType)
  @IsOptional()
  availabilityType?: AvailabilityType;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  specSummary?: string;

  @IsDateString()
  @IsOptional()
  estimatedShipAt?: string;

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
