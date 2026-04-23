import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import {
  generateSkuCandidate,
  normalizeSku,
  ensureUniqueSku,
} from '../../utils/sku-generator';

@Injectable()
export class ProductVariantsService {
  private readonly logger = new Logger(ProductVariantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

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
    if (!variant) throw new NotFoundException('版本不存在');
    return variant;
  }

  async create(
    productId: string,
    dto: CreateProductVariantDto,
    isBrandManager = false,
  ) {
    // Verify product exists and load brand info
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { brand: true },
    });
    if (!product) throw new NotFoundException('商品不存在');

    // If this is set as default, clear other defaults
    if (dto.isDefault) {
      await this.clearDefaults(productId);
    }

    // If no variants exist yet, make this the default
    const count = await this.prisma.productVariant.count({
      where: { productId },
    });

    // Brand managers cannot dictate SKU / manufacturer SKU — the frontend
    // disables these fields, the API now matches that contract.
    const sanitizedDto: CreateProductVariantDto = isBrandManager
      ? { ...dto, sku: undefined, manufacturerSku: undefined }
      : dto;

    // Generate or normalize SKU
    const sku = await this.resolveSkuForCreate(sanitizedDto, product);

    const { coverImageUploadFileId, ...variantData } = sanitizedDto;
    const variant = await this.prisma.productVariant.create({
      data: {
        ...variantData,
        sku,
        productId,
        isDefault: dto.isDefault ?? count === 0,
        specifications: sanitizedDto.specifications ?? undefined,
        manufacturerSku: sanitizedDto.manufacturerSku || undefined,
      },
    });

    if (coverImageUploadFileId) {
      await this.markCoverAsUsed(variant.id, coverImageUploadFileId);
    }
    return variant;
  }

  async update(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
    isBrandManager = false,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('版本不存在');

    // If setting as default, clear other defaults
    if (dto.isDefault) {
      await this.clearDefaults(productId);
    }

    const { coverImageUploadFileId, ...rest } = dto;

    // Brand managers cannot edit SKU / manufacturer SKU. Frontend disables
    // the inputs but the API was honouring values posted directly.
    if (isBrandManager) {
      delete (rest as Record<string, unknown>).sku;
      delete (rest as Record<string, unknown>).manufacturerSku;
    }

    // Only update SKU if explicitly provided
    const data: any = {
      ...rest,
      specifications: rest.specifications ?? undefined,
      manufacturerSku: rest.manufacturerSku !== undefined ? (rest.manufacturerSku || null) : undefined,
    };

    if (rest.sku !== undefined && rest.sku !== '') {
      const normalized = normalizeSku(rest.sku);
      // Check uniqueness (exclude current variant)
      const existing = await this.prisma.productVariant.findFirst({
        where: { sku: normalized, id: { not: variantId } },
      });
      if (existing) {
        throw new BadRequestException(`SKU "${normalized}" 已被占用`);
      }
      data.sku = normalized;
    } else {
      // Don't change SKU if not provided
      delete data.sku;
    }

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data,
    });

    if (coverImageUploadFileId) {
      await this.markCoverAsUsed(variantId, coverImageUploadFileId);
    }
    return updated;
  }

  async remove(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('版本不存在');

    // Protect default variant from deletion
    if (variant.isDefault) {
      throw new BadRequestException(
        '不能删除默认版本，请先将其他版本设为默认版本。',
      );
    }

    await this.prisma.productVariant.delete({ where: { id: variantId } });

    return { success: true };
  }

  // ── Helpers ──────────────────────────────────────────────

  /**
   * Mark the upload backing this variant's cover image as USED so the
   * temp-upload cleanup cron doesn't reap the underlying COS object after
   * 24h. Logged-only on failure — the variant row is the source of truth.
   */
  private async markCoverAsUsed(variantId: string, uploadFileId: string) {
    try {
      await this.uploadsService.markAsUsed(
        uploadFileId,
        'product-variant',
        variantId,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to mark upload ${uploadFileId} as USED for variant ${variantId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

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
        throw new BadRequestException(`SKU "${normalized}" 已被占用`);
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
