import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductImagesService } from './product-images.service';
import { ProductVariantsService } from './product-variants.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddProductImagesDto } from './dto/add-product-images.dto';
import { ReorderProductImagesDto } from './dto/reorder-product-images.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Controller('admin/products')
export class ProductsAdminController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productImagesService: ProductImagesService,
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // ── Product Images ──────────────────────────────────────

  @Get(':id/images')
  getImages(@Param('id') id: string) {
    return this.productImagesService.findByProductId(id);
  }

  @Post(':id/images')
  addImages(@Param('id') id: string, @Body() dto: AddProductImagesDto) {
    return this.productImagesService.addImages(id, dto.images);
  }

  @Patch(':id/images/reorder')
  reorderImages(
    @Param('id') id: string,
    @Body() dto: ReorderProductImagesDto,
  ) {
    return this.productImagesService.reorder(id, dto.items);
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
  getVariants(@Param('id') id: string) {
    return this.productVariantsService.findByProductId(id);
  }

  @Post(':id/variants')
  createVariant(
    @Param('id') id: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.productVariantsService.create(id, dto);
  }

  @Get(':id/variants/:variantId')
  getVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productVariantsService.findOne(id, variantId);
  }

  @Patch(':id/variants/:variantId')
  updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productVariantsService.update(id, variantId, dto);
  }

  @Delete(':id/variants/:variantId')
  removeVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productVariantsService.remove(id, variantId);
  }
}
