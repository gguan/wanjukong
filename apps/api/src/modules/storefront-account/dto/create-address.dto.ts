import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  fullName!: string;

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

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
