import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { ProductImageItemDto } from './dto/add-product-images.dto';
import { ReorderItemDto } from './dto/reorder-product-images.dto';

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  /**
   * List all images for a product, ordered by sortOrder.
   */
  findByProductId(productId: string) {
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Attach one or more images to a product.
   * Auto-assigns sortOrder after existing images.
   * First image becomes primary if product has no primary yet.
   */
  async addImages(productId: string, images: ProductImageItemDto[]) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('商品不存在');

    // Get current max sortOrder
    const last = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'desc' },
    });
    let nextOrder = (last?.sortOrder ?? -1) + 1;

    // Check if there's already a primary image
    const hasPrimary = await this.prisma.productImage.count({
      where: { productId, isPrimary: true },
    });

    const created = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const isPrimary = hasPrimary === 0 && i === 0;

      const record = await this.prisma.productImage.create({
        data: {
          productId,
          uploadFileId: img.uploadFileId || null,
          imageUrl: img.imageUrl,
          altText: img.altText || null,
          sortOrder: nextOrder++,
          isPrimary,
        },
      });

      // Mark UploadFile as USED
      if (img.uploadFileId) {
        await this.uploadsService
          .markAsUsed(img.uploadFileId, 'product', productId)
          .catch(() => {
            /* best-effort */
          });
      }

      // If first primary, sync coverImageUrl
      if (isPrimary) {
        await this.syncCoverImage(productId, img.imageUrl);
      }

      created.push(record);
    }

    return created;
  }

  /**
   * Set one image as primary. Clears primary from others.
   * Syncs Product.coverImageUrl.
   */
  async setPrimary(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) {
      throw new BadRequestException('该图片不属于当前商品');
    }

    // Clear all primaries for this product
    await this.prisma.productImage.updateMany({
      where: { productId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set the target as primary
    await this.prisma.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });

    // Sync cover image
    await this.syncCoverImage(productId, image.imageUrl);

    return { success: true };
  }

  /**
   * Reorder images by setting sortOrder.
   */
  async reorder(productId: string, items: ReorderItemDto[]) {
    for (const item of items) {
      await this.prisma.productImage.updateMany({
        where: { id: item.id, productId },
        data: { sortOrder: item.sortOrder },
      });
    }

    return this.findByProductId(productId);
  }

  /**
   * Remove an image relation from a product.
   * If it was primary, pick the next image by sortOrder.
   */
  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) {
      throw new BadRequestException('该图片不属于当前商品');
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });

    // If deleted image was primary, assign new primary
    if (image.isPrimary) {
      const next = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });

      if (next) {
        await this.prisma.productImage.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
        await this.syncCoverImage(productId, next.imageUrl);
      } else {
        // No images left
        await this.syncCoverImage(productId, null);
      }
    }

    return { success: true };
  }

  // ── Helper ──────────────────────────────────────────────

  private async syncCoverImage(productId: string, imageUrl: string | null) {
    await this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl },
    });
  }
}
