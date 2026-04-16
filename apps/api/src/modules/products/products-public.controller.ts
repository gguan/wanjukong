import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { localizeProduct, Lang, DEFAULT_LANG } from '../../utils/i18n';

@Controller('public/products')
export class ProductsPublicController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @Query('brand') brand?: string,
    @Query('category') category?: string,
    @Query('scale') scale?: string,
    @Query('availability') availability?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('lang') lang?: string,
  ) {
    const result = await this.productsService.findAllActive({
      brand,
      category,
      scale,
      availability,
      search,
      featured: featured === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    const l = (lang as Lang) || DEFAULT_LANG;
    return {
      ...result,
      data: result.data.map((p: Record<string, unknown>) => localizeProduct(p, l)),
    };
  }

  @Get('variants/:variantId/stock')
  async checkVariantStock(@Param('variantId') variantId: string) {
    return this.productsService.checkVariantStock(variantId);
  }

  @Get(':slug')
  async findBySlug(
    @Param('slug') slug: string,
    @Query('lang') lang?: string,
  ) {
    const product = await this.productsService.findBySlug(slug);
    if (!product) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }
    const l = (lang as Lang) || DEFAULT_LANG;
    return localizeProduct(product as unknown as Record<string, unknown>, l);
  }
}
