import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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

class GenerateSlugDto {
  @IsString()
  name!: string;
}

// Per-admin quota on AI translate. DeepL bills by character; a compromised
// admin account without a cap could rack up thousands of dollars in hours.
// 30 calls/minute gives normal UI usage plenty of headroom.
@Throttle({ default: { ttl: 60_000, limit: 30 } })
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

  @Post('generate-slug')
  async generateSlug(@Body() dto: GenerateSlugDto) {
    const slug = await this.translateService.generateSlug(dto.name);
    return { slug };
  }
}
