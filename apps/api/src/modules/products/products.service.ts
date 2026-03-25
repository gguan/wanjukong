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
    return this.prisma.product.create({
      data: dto,
      include: includeRelations,
    });
  }

  update(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: dto,
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
