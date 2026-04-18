import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { Public } from '../admin-auth/decorators/public.decorator';
import { BrandsService } from './brands.service';
import { localizeObject, localizeProduct, Lang, DEFAULT_LANG } from '../../utils/i18n';
import { toPublicUrl } from '../../utils/image-url';

function withLogoUrl(brand: Record<string, unknown>): Record<string, unknown> {
  return { ...brand, logo: toPublicUrl(brand.logo as string | null) };
}

@Public()
@Controller('public/brands')
export class BrandsPublicController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  async findAll(@Query('lang') lang?: string) {
    const brands = await this.brandsService.findAll();
    const l = (lang as Lang) || DEFAULT_LANG;
    return brands.map((b: Record<string, unknown>) =>
      withLogoUrl(localizeObject(b, l) as Record<string, unknown>),
    );
  }

  @Get(':slug')
  async findBySlug(
    @Param('slug') slug: string,
    @Query('lang') lang?: string,
  ) {
    const brand = await this.brandsService.findBySlug(slug);
    if (!brand) {
      throw new NotFoundException(`Brand "${slug}" not found`);
    }
    const products =
      await this.brandsService.findActiveProductsByBrandSlug(slug);
    const l = (lang as Lang) || DEFAULT_LANG;
    return {
      ...withLogoUrl(localizeObject(brand as Record<string, unknown>, l) as Record<string, unknown>),
      products: products.map((p: Record<string, unknown>) => localizeProduct(p, l)),
    };
  }
}
