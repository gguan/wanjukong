import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('public/products')
export class ProductsPublicController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('brand') brand?: string,
    @Query('category') category?: string,
    @Query('scale') scale?: string,
    @Query('availability') availability?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAllActive({
      brand,
      category,
      scale,
      availability,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('variants/:variantId/stock')
  async checkVariantStock(@Param('variantId') variantId: string) {
    return this.productsService.checkVariantStock(variantId);
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findBySlug(slug);
    if (!product) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }
    return product;
  }
}
