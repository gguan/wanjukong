import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('public/categories')
export class CategoriesPublicController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }
}
