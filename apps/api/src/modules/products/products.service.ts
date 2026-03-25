import { Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const includeRelations = { brand: true, category: true };

const includeRelationsWithImages = {
  brand: true,
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
};

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

  create(dto: CreateProductDto) {
    const data: any = { ...dto };
    // Convert date strings to Date objects
    if (dto.preorderStartAt) data.preorderStartAt = new Date(dto.preorderStartAt);
    if (dto.preorderEndAt) data.preorderEndAt = new Date(dto.preorderEndAt);
    if (dto.estimatedShipAt) data.estimatedShipAt = new Date(dto.estimatedShipAt);
    // Clear preorder dates if sale type is IN_STOCK
    if (dto.saleType === 'IN_STOCK') {
      data.preorderStartAt = null;
      data.preorderEndAt = null;
    }
    return this.prisma.product.create({
      data,
      include: includeRelations,
    });
  }

  update(id: string, dto: UpdateProductDto) {
    const data: any = { ...dto };
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

  findAllActive(filters: ProductFilters = {}) {
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
    if (filters.availability) {
      where.availability = filters.availability as any;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        ...includeRelations,
        variants: {
          where: { status: ProductStatus.ACTIVE },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.ACTIVE },
      include: {
        ...includeRelationsFull,
        // Only return ACTIVE variants for public
        variants: {
          where: { status: ProductStatus.ACTIVE },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }
}
