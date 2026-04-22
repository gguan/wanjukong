import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class BrandAssignmentsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  brandIds!: string[];
}
