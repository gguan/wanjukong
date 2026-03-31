import { Controller, Get, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { localizeObject, Lang, DEFAULT_LANG } from '../../utils/i18n';

@Controller('public/categories')
export class CategoriesPublicController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Query('lang') lang?: string) {
    const categories = await this.categoriesService.findAll();
    const l = (lang as Lang) || DEFAULT_LANG;
    return categories.map((c: Record<string, unknown>) => localizeObject(c, l));
  }
}
