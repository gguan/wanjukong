import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { BrandsService } from './brands.service';

@Controller('public/brands')
export class BrandsPublicController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  findAll() {
    return this.brandsService.findAll();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const brand = await this.brandsService.findBySlug(slug);
    if (!brand) {
      throw new NotFoundException(`Brand "${slug}" not found`);
    }
    const products =
      await this.brandsService.findActiveProductsByBrandSlug(slug);
    return { ...brand, products };
  }
}
