import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
