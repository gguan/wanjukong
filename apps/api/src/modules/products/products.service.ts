import { Injectable } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const includeRelations = { brand: true, category: true };

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
      include: includeRelations,
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

  findAllActive() {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      include: includeRelations,
      orderBy: { createdAt: 'desc' },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.ACTIVE },
      include: includeRelations,
    });
  }
}
