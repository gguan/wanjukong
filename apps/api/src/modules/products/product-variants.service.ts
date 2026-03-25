import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  findByProductId(productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    return variant;
  }

  async create(productId: string, dto: CreateProductVariantDto) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // If this is set as default, clear other defaults
    if (dto.isDefault) {
      await this.clearDefaults(productId);
    }

    // If no variants exist yet, make this the default
    const count = await this.prisma.productVariant.count({
      where: { productId },
    });

    return this.prisma.productVariant.create({
      data: {
        ...dto,
        productId,
        isDefault: dto.isDefault ?? count === 0,
        estimatedShipAt: dto.estimatedShipAt
          ? new Date(dto.estimatedShipAt)
          : undefined,
        specifications: dto.specifications ?? undefined,
      },
    });
  }

  async update(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    // If setting as default, clear other defaults
    if (dto.isDefault) {
      await this.clearDefaults(productId);
    }

    const data: any = { ...dto };
    if (dto.estimatedShipAt !== undefined) {
      data.estimatedShipAt = dto.estimatedShipAt
        ? new Date(dto.estimatedShipAt)
        : null;
    }
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data,
    });
  }

  async remove(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    // Protect default variant from deletion
    if (variant.isDefault) {
      throw new BadRequestException(
        'Cannot delete the default variant. Set another variant as default first.',
      );
    }

    await this.prisma.productVariant.delete({ where: { id: variantId } });

    return { success: true };
  }

  private async clearDefaults(productId: string) {
    await this.prisma.productVariant.updateMany({
      where: { productId, isDefault: true },
      data: { isDefault: false },
    });
  }
}
