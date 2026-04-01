import { Controller, Post, Body } from '@nestjs/common';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { TranslateService } from './translate.service';

class TranslateDto {
  @IsString()
  text!: string;

  @IsArray()
  @IsOptional()
  targetLangs?: string[];

  /** Set true when text contains HTML (e.g. rich text from TipTap) */
  @IsBoolean()
  @IsOptional()
  isHtml?: boolean;
}

@Controller('admin/translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post()
  translate(@Body() dto: TranslateDto) {
    return this.translateService.translateToAll(
      dto.text,
      dto.targetLangs,
      dto.isHtml,
    );
  }
}
