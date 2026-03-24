import { Controller, Get } from '@nestjs/common';
import { BrandsService } from './brands.service';

@Controller('public/brands')
export class BrandsPublicController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  findAll() {
    return this.brandsService.findAll();
  }
}
