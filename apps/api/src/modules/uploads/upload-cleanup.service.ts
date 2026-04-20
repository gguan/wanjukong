import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

let COS: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  COS = require('cos-nodejs-sdk-v5');
} catch {
  // cos-nodejs-sdk-v5 is optional; cleanup will skip COS deletion if unavailable
}

/**
 * After this many consecutive delete failures we stop retrying a row and
 * mark it FAILED. Prevents an unreachable bucket / permission issue from
 * filling the logs every hour with the same N errors forever.
 */
const FAILURE_THRESHOLD = 5;

@Injectable()
export class UploadCleanupService {
  private readonly logger = new Logger(UploadCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTempUploads() {
    const now = new Date();

    const expiredFiles = await this.prisma.uploadFile.findMany({
      where: {
        status: 'TEMP',
        expiresAt: { lt: now },
      },
      take: 100,
    });

    if (expiredFiles.length === 0) return;

    this.logger.log(`Found ${expiredFiles.length} expired temp uploads to evaluate`);

    let rescued = 0;
    let deleted = 0;
    let failed = 0;

    for (const file of expiredFiles) {
      // Defense in depth: even when a save path forgot to call markAsUsed,
      // any entity that references this objectKey wins over the cleanup.
      // Promote the row to USED so we don't repeatedly re-evaluate it.
      const referencedBy = await this.findReferencingEntity(file.objectKey);
      if (referencedBy) {
        await this.prisma.uploadFile.update({
          where: { id: file.id },
          data: {
            status: 'USED',
            linkedEntityType: referencedBy.type,
            linkedEntityId: referencedBy.id,
            expiresAt: null,
            failureCount: 0,
          },
        });
        rescued++;
        this.logger.warn(
          `Rescued ${file.objectKey} — still referenced by ${referencedBy.type} ${referencedBy.id}. ` +
            'Some save path forgot to call uploadsService.markAsUsed; please fix the caller.',
        );
        continue;
      }

      try {
        await this.deleteCosObject(file.bucket, file.region, file.objectKey);
        await this.prisma.uploadFile.update({
          where: { id: file.id },
          data: { status: 'DELETED' },
        });
        deleted++;
      } catch (err) {
        const nextCount = file.failureCount + 1;
        if (nextCount >= FAILURE_THRESHOLD) {
          await this.prisma.uploadFile.update({
            where: { id: file.id },
            data: { status: 'FAILED', failureCount: nextCount },
          });
          this.logger.error(
            `Giving up on ${file.objectKey} after ${nextCount} failed delete attempts; marked FAILED. ` +
              `Last error: ${(err as Error).message}`,
          );
        } else {
          await this.prisma.uploadFile.update({
            where: { id: file.id },
            data: { failureCount: nextCount },
          });
          this.logger.warn(
            `Delete attempt ${nextCount}/${FAILURE_THRESHOLD} failed for ${file.objectKey}: ${(err as Error).message}`,
          );
        }
        failed++;
      }
    }

    this.logger.log(
      `Cleanup pass: rescued=${rescued} deleted=${deleted} failed=${failed}`,
    );
  }

  /**
   * Check whether any entity still references this object key. Returns the
   * first matching (entity type, id) so we can backfill linkedEntity*.
   *
   * Adding a new entity that holds image keys? Add a check here too.
   */
  private async findReferencingEntity(
    objectKey: string,
  ): Promise<{ type: string; id: string } | null> {
    const [brand, product, variant, productImage] = await Promise.all([
      this.prisma.brand.findFirst({
        where: { logo: objectKey },
        select: { id: true },
      }),
      this.prisma.product.findFirst({
        where: { imageUrl: objectKey },
        select: { id: true },
      }),
      this.prisma.productVariant.findFirst({
        where: { coverImageUrl: objectKey },
        select: { id: true },
      }),
      this.prisma.productImage.findFirst({
        where: { imageUrl: objectKey },
        select: { id: true },
      }),
    ]);

    if (brand) return { type: 'brand', id: brand.id };
    if (product) return { type: 'product', id: product.id };
    if (variant) return { type: 'product-variant', id: variant.id };
    if (productImage) return { type: 'product-image', id: productImage.id };
    return null;
  }

  private async deleteCosObject(
    bucket: string,
    region: string,
    key: string,
  ): Promise<void> {
    const secretId = process.env.TENCENT_COS_SECRET_ID;
    const secretKey = process.env.TENCENT_COS_SECRET_KEY;

    if (!COS || !secretId || !secretKey) {
      this.logger.warn('COS SDK or credentials not available, skipping object deletion');
      return;
    }

    const cos = new COS({ SecretId: secretId, SecretKey: secretKey });

    return new Promise((resolve, reject) => {
      cos.deleteObject(
        { Bucket: bucket, Region: region, Key: key },
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }
}
