import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { Request } from 'express';
import { ProductsService } from './products.service';
import { ProductImagesService } from './product-images.service';
import { ProductVariantsService } from './product-variants.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddProductImagesDto } from './dto/add-product-images.dto';
import { ReorderProductImagesDto } from './dto/reorder-product-images.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { BrandPermissionGuard } from '../admin-auth/guards/brand-permission.guard';
import { Roles } from '../admin-auth/decorators/roles.decorator';
import { toPublicUrl, normalizeKey } from '../../utils/image-url';

/**
 * Convert an incoming imageUrl/coverImageUrl from the admin form into the
 * value Prisma should write:
 * - undefined  → leave field untouched
 * - empty/null → explicit null (clears the column)
 * - full URL   → strip the CDN base, store the object key
 */
function resolveImageWrite(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (!value) return null;
  return normalizeKey(value) || null;
}

function withImageUrl<T extends { imageUrl?: string | null }>(p: T): T {
  return { ...p, imageUrl: toPublicUrl(p.imageUrl) };
}

function withImagesUrls<T extends { imageUrl: string }>(imgs: T[]): T[] {
  return imgs.map((i) => ({ ...i, imageUrl: toPublicUrl(i.imageUrl) as string }));
}

function withVariantUrls<T extends { coverImageUrl?: string | null }>(v: T): T {
  return { ...v, coverImageUrl: toPublicUrl(v.coverImageUrl) };
}

@UseGuards(BrandPermissionGuard)
@Controller('admin/products')
export class ProductsAdminController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productImagesService: ProductImagesService,
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const allowedBrandIds = (req as any).allowedBrandIds;
    const result = await this.productsService.findAll(allowedBrandIds, {
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { ...result, data: result.data.map(withImageUrl) };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return withImageUrl(product);
  }

  @Post()
  async create(@Body() dto: CreateProductDto) {
    const normalized = {
      ...dto,
      imageUrl: resolveImageWrite(dto.imageUrl) ?? undefined,
    };
    const product = await this.productsService.create(normalized);
    return withImageUrl(product);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req: Request) {
    const isBrandManager = (req as any).session?.adminRole === 'BRAND_MANAGER';
    const normalized: UpdateProductDto = { ...dto };
    if (dto.imageUrl !== undefined) {
      normalized.imageUrl = resolveImageWrite(dto.imageUrl);
    }
    const product = await this.productsService.update(id, normalized, isBrandManager);
    return withImageUrl(product);
  }

  /** Only super admins can hard-delete products. Frontend already hides the
   *  button for everyone else, but the API was honouring direct calls. */
  @Roles(AdminRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // ── Review Workflow ─────────────────────────────────────

  /** Brand manager: DRAFT → PENDING_REVIEW */
  @Post(':id/submit-review')
  async submitForReview(@Param('id') id: string) {
    return withImageUrl(await this.productsService.submitForReview(id));
  }

  /** Brand manager: PENDING_REVIEW → DRAFT */
  @Post(':id/withdraw-review')
  async withdrawReview(@Param('id') id: string) {
    return withImageUrl(await this.productsService.withdrawReview(id));
  }

  /** Admin only: PENDING_REVIEW|DRAFT → ACTIVE.
   *  Without this guard a brand manager could self-approve via a direct API
   *  call, bypassing the review workflow the UI implies. */
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @Post(':id/approve')
  async approve(@Param('id') id: string) {
    return withImageUrl(await this.productsService.approve(id));
  }

  /** Admin only: PENDING_REVIEW → DRAFT */
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @Post(':id/reject')
  async reject(@Param('id') id: string) {
    return withImageUrl(await this.productsService.reject(id));
  }

  /** Admin or brand manager: ACTIVE → INACTIVE */
  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return withImageUrl(await this.productsService.deactivate(id));
  }

  /** Admin only: INACTIVE → ACTIVE */
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @Post(':id/reactivate')
  async reactivate(@Param('id') id: string) {
    return withImageUrl(await this.productsService.reactivate(id));
  }

  // ── Product Images ──────────────────────────────────────

  @Get(':id/images')
  async getImages(@Param('id') id: string) {
    const imgs = await this.productImagesService.findByProductId(id);
    return withImagesUrls(imgs);
  }

  @Post(':id/images')
  async addImages(@Param('id') id: string, @Body() dto: AddProductImagesDto) {
    // Normalize incoming URLs to object keys
    const images = dto.images.map((img) => ({
      ...img,
      imageUrl: normalizeKey(img.imageUrl) ?? img.imageUrl,
    }));
    const result = await this.productImagesService.addImages(id, images);
    return Array.isArray(result) ? withImagesUrls(result) : result;
  }

  @Patch(':id/images/reorder')
  async reorderImages(
    @Param('id') id: string,
    @Body() dto: ReorderProductImagesDto,
  ) {
    const result = await this.productImagesService.reorder(id, dto.items);
    return Array.isArray(result) ? withImagesUrls(result) : result;
  }

  @Patch(':id/images/:imageId/primary')
  setPrimaryImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productImagesService.setPrimary(id, imageId);
  }

  @Delete(':id/images/:imageId')
  removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productImagesService.removeImage(id, imageId);
  }

  // ── Product Variants ────────────────────────────────────

  @Get(':id/variants')
  async getVariants(@Param('id') id: string) {
    const variants = await this.productVariantsService.findByProductId(id);
    return variants.map(withVariantUrls);
  }

  @Post(':id/variants')
  async createVariant(
    @Param('id') id: string,
    @Body() dto: CreateProductVariantDto,
    @Req() req: Request,
  ) {
    const isBrandManager = (req as any).session?.adminRole === 'BRAND_MANAGER';
    const normalized: CreateProductVariantDto = { ...dto };
    if (dto.coverImageUrl !== undefined) {
      normalized.coverImageUrl = resolveImageWrite(dto.coverImageUrl) ?? undefined;
    }
    const v = await this.productVariantsService.create(id, normalized, isBrandManager);
    return withVariantUrls(v);
  }

  @Get(':id/variants/:variantId')
  async getVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    const v = await this.productVariantsService.findOne(id, variantId);
    return withVariantUrls(v);
  }

  @Patch(':id/variants/:variantId')
  async updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
    @Req() req: Request,
  ) {
    const isBrandManager = (req as any).session?.adminRole === 'BRAND_MANAGER';
    const normalized: UpdateProductVariantDto = { ...dto };
    if (dto.coverImageUrl !== undefined) {
      normalized.coverImageUrl = resolveImageWrite(dto.coverImageUrl);
    }
    const v = await this.productVariantsService.update(id, variantId, normalized, isBrandManager);
    return withVariantUrls(v);
  }

  @Delete(':id/variants/:variantId')
  removeVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productVariantsService.remove(id, variantId);
  }
}
