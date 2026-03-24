import { IsString, IsOptional } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  logo?: string;
}
