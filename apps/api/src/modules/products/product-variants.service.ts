import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import {
  generateSkuCandidate,
  normalizeSku,
  ensureUniqueSku,
} from '../../utils/sku-generator';

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
    // Verify product exists and load brand info
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { brand: true },
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

    // Generate or normalize SKU
    const sku = await this.resolveSkuForCreate(dto, product);

    return this.prisma.productVariant.create({
      data: {
        ...dto,
        sku,
        productId,
        isDefault: dto.isDefault ?? count === 0,
        specifications: dto.specifications ?? undefined,
        manufacturerSku: dto.manufacturerSku || undefined,
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

    // Only update SKU if explicitly provided
    const data: any = {
      ...dto,
      specifications: dto.specifications ?? undefined,
      manufacturerSku: dto.manufacturerSku !== undefined ? (dto.manufacturerSku || null) : undefined,
    };

    if (dto.sku !== undefined && dto.sku !== '') {
      const normalized = normalizeSku(dto.sku);
      // Check uniqueness (exclude current variant)
      const existing = await this.prisma.productVariant.findFirst({
        where: { sku: normalized, id: { not: variantId } },
      });
      if (existing) {
        throw new BadRequestException(`SKU "${normalized}" is already in use`);
      }
      data.sku = normalized;
    } else {
      // Don't change SKU if not provided
      delete data.sku;
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

  // ── Helpers ──────────────────────────────────────────────

  private async clearDefaults(productId: string) {
    await this.prisma.productVariant.updateMany({
      where: { productId, isDefault: true },
      data: { isDefault: false },
    });
  }

  /**
   * Resolve SKU for a new variant: normalize if provided, auto-generate if blank.
   */
  private async resolveSkuForCreate(
    dto: CreateProductVariantDto,
    product: { name: string; slug: string; brand: { name: string; code: string | null } },
  ): Promise<string> {
    // If admin provided a SKU, normalize and check uniqueness
    if (dto.sku && dto.sku.trim()) {
      const normalized = normalizeSku(dto.sku);
      const existing = await this.prisma.productVariant.findFirst({
        where: { sku: normalized },
      });
      if (existing) {
        throw new BadRequestException(`SKU "${normalized}" is already in use`);
      }
      return normalized;
    }

    // Auto-generate
    const candidate = generateSkuCandidate({
      brandName: product.brand.name,
      brandCode: product.brand.code,
      manufacturerSku: dto.manufacturerSku,
      productName: product.name,
      slug: product.slug,
      variantName: dto.name,
    });

    // Get all existing SKUs and ensure uniqueness
    const allSkus = await this.prisma.productVariant.findMany({
      select: { sku: true },
    });
    const skuSet = new Set(allSkus.map((v) => v.sku.toUpperCase()));

    return ensureUniqueSku(candidate, skuSet);
  }
}
