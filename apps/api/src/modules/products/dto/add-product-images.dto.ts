import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductImageItemDto {
  @IsString()
  imageUrl!: string;

  @IsString()
  @IsOptional()
  uploadFileId?: string;

  @IsString()
  @IsOptional()
  altText?: string;
}

export class AddProductImagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageItemDto)
  images!: ProductImageItemDto[];
}
