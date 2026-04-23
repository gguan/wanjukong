import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { toPublicProductView } from './product-storefront.presenter';
import {
  generateSkuCandidate,
  normalizeSku,
  ensureUniqueSku,
} from '../../utils/sku-generator';

const includeRelations = { brand: true, category: true };

const includeRelationsFull = {
  brand: true,
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { orderBy: { sortOrder: 'asc' as const } },
};

export interface ProductFilters {
  brand?: string;
  category?: string;
  scale?: string;
  availability?: string;
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    brandIds?: string[],
    query?: { search?: string; status?: string; page?: number; limit?: number },
  ) {
    const where: Prisma.ProductWhereInput = {};
    if (brandIds) {
      where.brandId = { in: brandIds };
    }
    if (query?.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query?.status) {
      where.status = query.status as any;
    }

    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: includeRelations,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  findOne(id: string) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: includeRelationsFull,
    });
  }

  async create(dto: CreateProductDto) {
    const { defaultVariant, ...rest } = dto;
    const data: Prisma.ProductUncheckedCreateInput = { ...rest };
    // Convert date strings to Date objects
    if (dto.preorderStartAt) data.preorderStartAt = new Date(dto.preorderStartAt);
    if (dto.preorderEndAt) data.preorderEndAt = new Date(dto.preorderEndAt);
    if (dto.estimatedShipAt) data.estimatedShipAt = new Date(dto.estimatedShipAt);
    // Clear preorder dates if sale type is IN_STOCK
    if (dto.saleType === 'IN_STOCK') {
      data.preorderStartAt = null;
      data.preorderEndAt = null;
      data.estimatedShipAt = null;
      data.depositCents = null;
      data.usdDepositCents = null;
    }
    // Resolve SKU for default variant before transaction
    const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
    let variantSku: string;
    if (defaultVariant.sku && defaultVariant.sku.trim()) {
      variantSku = normalizeSku(defaultVariant.sku);
    } else {
      const candidate = generateSkuCandidate({
        brandName: brand?.name || 'BRAND',
        brandCode: brand?.code,
        manufacturerSku: defaultVariant.manufacturerSku,
        productName: dto.name,
        slug: dto.slug,
        variantName: defaultVariant.name,
      });
      const allSkus = await this.prisma.productVariant.findMany({ select: { sku: true } });
      const skuSet = new Set(allSkus.map((v) => v.sku.toUpperCase()));
      variantSku = ensureUniqueSku(candidate, skuSet);
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data,
        include: includeRelations,
      });

      await tx.productVariant.create({
        data: {
          productId: product.id,
          name: defaultVariant.name,
          sku: variantSku,
          manufacturerSku: defaultVariant.manufacturerSku || undefined,
          priceCents: defaultVariant.priceCents,
          stock: defaultVariant.stock,
          isDefault: true,
          sortOrder: 0,
        },
      });

      return product;
    });
  }

  /**
   * Update product. If a brand manager edits a product that is ACTIVE or
   * PENDING_REVIEW, status auto-reverts to DRAFT so it goes through review
   * again. INACTIVE and DRAFT keep their state — silently turning an
   * admin-deactivated product into DRAFT was destroying the offline reason.
   */
  async update(id: string, dto: UpdateProductDto, isBrandManager = false) {
    const data: Prisma.ProductUncheckedUpdateInput = { ...dto };
    if (dto.preorderStartAt !== undefined) {
      data.preorderStartAt = dto.preorderStartAt ? new Date(dto.preorderStartAt) : null;
    }
    if (dto.preorderEndAt !== undefined) {
      data.preorderEndAt = dto.preorderEndAt ? new Date(dto.preorderEndAt) : null;
    }
    if (dto.estimatedShipAt !== undefined) {
      data.estimatedShipAt = dto.estimatedShipAt ? new Date(dto.estimatedShipAt) : null;
    }
    if (dto.saleType === 'IN_STOCK') {
      data.preorderStartAt = null;
      data.preorderEndAt = null;
      data.estimatedShipAt = null;
      data.depositCents = null;
      data.usdDepositCents = null;
    }

    if (isBrandManager) {
      // Brand managers can't touch admin-only fields. Frontend disables
      // these inputs but the API was honouring the values anyway.
      delete (data as Record<string, unknown>).isFeatured;
      delete (data as Record<string, unknown>).featuredSort;
      delete (data as Record<string, unknown>).slug;
      delete (data as Record<string, unknown>).status;

      const current = await this.prisma.product.findUnique({
        where: { id },
        select: { status: true },
      });
      if (current?.status === 'ACTIVE' || current?.status === 'PENDING_REVIEW') {
        data.status = 'DRAFT';
      }
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: includeRelations,
    });
  }

  // ─── Review Workflow ─────────────────────────────────────

  /**
   * Brand manager submits product for review: DRAFT → PENDING_REVIEW
   */
  async submitForReview(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.status !== 'DRAFT') {
      throw new BadRequestException('只有草稿状态的商品可以提交审核');
    }
    return this.prisma.product.update({
      where: { id },
      data: { status: 'PENDING_REVIEW' },
      include: includeRelations,
    });
  }

  /**
   * Brand manager withdraws review: PENDING_REVIEW → DRAFT
   */
  async withdrawReview(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('只有待审核状态的商品可以撤回');
    }
    return this.prisma.product.update({
      where: { id },
      data: { status: 'DRAFT' },
      include: includeRelations,
    });
  }

  /**
   * Admin approves: PENDING_REVIEW → ACTIVE (or DRAFT → ACTIVE for admins)
   */
  async approve(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.status !== 'PENDING_REVIEW' && product.status !== 'DRAFT') {
      throw new BadRequestException('该商品状态不能直接上架');
    }
    return this.prisma.product.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: includeRelations,
    });
  }

  /**
   * Admin rejects: PENDING_REVIEW → DRAFT
   */
  async reject(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('只有待审核状态的商品可以驳回');
    }
    return this.prisma.product.update({
      where: { id },
      data: { status: 'DRAFT' },
      include: includeRelations,
    });
  }

  /**
   * Take product offline: ACTIVE → INACTIVE
   * Both admins and brand managers (for their own products) can do this.
   */
  async deactivate(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.status !== 'ACTIVE') {
      throw new BadRequestException('只有已上架的商品可以下架');
    }
    return this.prisma.product.update({
      where: { id },
      data: { status: 'INACTIVE' },
      include: includeRelations,
    });
  }

  /**
   * Admin re-activates: INACTIVE → ACTIVE
   */
  async reactivate(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.status !== 'INACTIVE') {
      throw new BadRequestException('只有已下架的商品可以重新上架');
    }
    return this.prisma.product.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: includeRelations,
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  async findAllActive(filters: ProductFilters = {}) {
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
    };

    if (filters.brand) {
      where.brand = { slug: filters.brand };
    }
    if (filters.category) {
      where.category = { slug: filters.category };
    }
    if (filters.scale) {
      where.scale = filters.scale;
    }
    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.featured) {
      where.isFeatured = true;
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    // Featured products sort by featuredSort first, then by creation date
    const orderBy = filters.featured
      ? [{ featuredSort: 'asc' as const }, { createdAt: 'desc' as const }]
      : [{ createdAt: 'desc' as const }];

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          ...includeRelations,
          variants: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    let views = products.map((product) => toPublicProductView(product));
    if (filters.availability) {
      views = views.filter(
        (product) => product.displayAvailability === filters.availability,
      );
    }

    return { data: views, total, page, limit };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.ACTIVE },
      include: {
        ...includeRelationsFull,
        variants: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return product ? toPublicProductView(product) : null;
  }

  /**
   * Check stock availability for a specific variant.
   */
  async checkVariantStock(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return {
      available: variant.stock > 0,
      stock: variant.stock,
    };
  }
}
