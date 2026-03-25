import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

let COS: any;
try {
  COS = require('cos-nodejs-sdk-v5');
} catch {
  // cos-nodejs-sdk-v5 is optional; cleanup will skip COS deletion if unavailable
}

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

    this.logger.log(`Found ${expiredFiles.length} expired temp uploads to clean`);

    for (const file of expiredFiles) {
      try {
        await this.deleteCosObject(file.bucket, file.region, file.objectKey);

        await this.prisma.uploadFile.update({
          where: { id: file.id },
          data: { status: 'DELETED' },
        });

        this.logger.log(`Cleaned up: ${file.objectKey}`);
      } catch (err) {
        this.logger.error(
          `Failed to cleanup ${file.objectKey}: ${(err as Error).message}`,
        );
      }
    }
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
