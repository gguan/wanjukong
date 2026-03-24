import {
  IsString,
  IsOptional,
  IsInt,
  IsEmail,
  Min,
} from 'class-validator';

export class CreateBuyNowOrderDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  country!: string;

  @IsString()
  @IsOptional()
  stateOrProvince?: string;

  @IsString()
  city!: string;

  @IsString()
  addressLine1!: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  currency?: string;
}
