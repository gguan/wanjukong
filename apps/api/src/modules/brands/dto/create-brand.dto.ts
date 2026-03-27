import { IsString, IsOptional } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
