import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class RegisterTempUploadDto {
  @IsString()
  objectKey!: string;

  @IsString()
  fileUrl!: string;

  @IsString()
  @IsOptional()
  originalFileName?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sizeBytes?: number;
}
