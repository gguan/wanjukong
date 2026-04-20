import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  findAll() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.brand.findUniqueOrThrow({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.brand.findUnique({ where: { slug } });
  }

  findActiveProductsByBrandSlug(slug: string) {
    return this.prisma.product.findMany({
      where: { brand: { slug }, status: ProductStatus.ACTIVE },
      include: { brand: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateBrandDto) {
    const { logoUploadFileId, ...data } = dto;
    const brand = await this.prisma.brand.create({ data });
    if (logoUploadFileId) {
      await this.markLogoAsUsed(brand.id, logoUploadFileId);
    }
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    const { logoUploadFileId, ...data } = dto;
    const brand = await this.prisma.brand.update({ where: { id }, data });
    if (logoUploadFileId) {
      await this.markLogoAsUsed(brand.id, logoUploadFileId);
    }
    return brand;
  }

  /**
   * Mark the upload backing this brand's logo as USED so the temp-upload
   * cleanup cron doesn't reap the underlying COS object after 24h.
   * Failure is logged but not thrown — the brand row is the source of
   * truth and we'd rather have a brand with a slightly leaky upload row
   * than a failed brand save.
   */
  private async markLogoAsUsed(brandId: string, uploadFileId: string) {
    try {
      await this.uploadsService.markAsUsed(uploadFileId, 'brand', brandId);
    } catch (err) {
      this.logger.warn(
        `Failed to mark upload ${uploadFileId} as USED for brand ${brandId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async remove(id: string) {
    const productCount = await this.prisma.product.count({ where: { brandId: id } });
    if (productCount > 0) {
      throw new BadRequestException(
        `该品牌下还有 ${productCount} 个商品，请先删除或转移商品后再删除品牌`,
      );
    }
    return this.prisma.brand.delete({ where: { id } });
  }
}
