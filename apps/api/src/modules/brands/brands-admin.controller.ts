import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Roles } from '../admin-auth/decorators/roles.decorator';
import { toPublicUrl, normalizeKey } from '../../utils/image-url';

function withLogoUrl<T extends { logo: string | null }>(brand: T): T {
  return { ...brand, logo: toPublicUrl(brand.logo) as string | null };
}

@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/brands')
export class BrandsAdminController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  async findAll() {
    const brands = await this.brandsService.findAll();
    return brands.map(withLogoUrl);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const brand = await this.brandsService.findOne(id);
    return withLogoUrl(brand);
  }

  @Post()
  async create(@Body() dto: CreateBrandDto) {
    // Strip base URL — only store object key
    const normalized = { ...dto, logo: normalizeKey(dto.logo) ?? undefined };
    const brand = await this.brandsService.create(normalized);
    return withLogoUrl(brand);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    const normalized = {
      ...dto,
      ...(dto.logo !== undefined ? { logo: normalizeKey(dto.logo) ?? undefined } : {}),
    };
    const brand = await this.brandsService.update(id, normalized);
    return withLogoUrl(brand);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.brandsService.remove(id);
  }
}
