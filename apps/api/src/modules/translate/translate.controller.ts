import { Controller, Post, Body } from '@nestjs/common';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { TranslateService } from './translate.service';

class TranslateDto {
  @IsString()
  text!: string;

  @IsArray()
  @IsOptional()
  targetLangs?: string[];
}

@Controller('admin/translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post()
  translate(@Body() dto: TranslateDto) {
    return this.translateService.translateToAll(dto.text, dto.targetLangs);
  }
}
