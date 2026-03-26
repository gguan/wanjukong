import { Injectable } from '@nestjs/common';
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
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      include: includeRelations,
      orderBy: { createdAt: 'desc' },
    });
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

  update(id: string, dto: UpdateProductDto) {
    const data: Prisma.ProductUncheckedUpdateInput = { ...dto };
    // Convert date strings to Date objects or null
    if (dto.preorderStartAt !== undefined) {
      data.preorderStartAt = dto.preorderStartAt ? new Date(dto.preorderStartAt) : null;
    }
    if (dto.preorderEndAt !== undefined) {
      data.preorderEndAt = dto.preorderEndAt ? new Date(dto.preorderEndAt) : null;
    }
    if (dto.estimatedShipAt !== undefined) {
      data.estimatedShipAt = dto.estimatedShipAt ? new Date(dto.estimatedShipAt) : null;
    }
    // Clear preorder dates if sale type is IN_STOCK
    if (dto.saleType === 'IN_STOCK') {
      data.preorderStartAt = null;
      data.preorderEndAt = null;
    }
    return this.prisma.product.update({
      where: { id },
      data,
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
    const products = await this.prisma.product.findMany({
      where,
      include: {
        ...includeRelations,
        variants: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const views = products.map((product) => toPublicProductView(product));
    if (!filters.availability) {
      return views;
    }
    return views.filter(
      (product) => product.displayAvailability === filters.availability,
    );
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
}
