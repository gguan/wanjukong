import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as STS from 'qcloud-cos-sts';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterTempUploadDto } from './dto/register-temp-upload.dto';

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  private get config() {
    return {
      secretId: process.env.TENCENT_COS_SECRET_ID || '',
      secretKey: process.env.TENCENT_COS_SECRET_KEY || '',
      bucket: process.env.TENCENT_COS_BUCKET || '',
      region: process.env.TENCENT_COS_REGION || '',
      publicBaseUrl: process.env.TENCENT_COS_PUBLIC_BASE_URL || '',
    };
  }

  /**
   * Generate temporary COS credentials for frontend direct upload.
   * Scoped to the products/ prefix with a 30-minute duration.
   */
  async getTemporaryCredentials() {
    const { secretId, secretKey, bucket, region, publicBaseUrl } = this.config;

    if (!secretId || !secretKey || !bucket || !region) {
      throw new InternalServerErrorException(
        'COS configuration is incomplete. Check environment variables.',
      );
    }

    const appId = bucket.split('-').pop() || '';

    const policy = {
      version: '2.0',
      statement: [
        {
          action: [
            'name/cos:PutObject',
            'name/cos:PostObject',
            'name/cos:InitiateMultipartUpload',
            'name/cos:ListMultipartUploads',
            'name/cos:ListParts',
            'name/cos:UploadPart',
            'name/cos:CompleteMultipartUpload',
          ],
          effect: 'allow',
          resource: [
            `qcs::cos:${region}:uid/${appId}:${bucket}/products/*`,
          ],
        },
      ],
    };

    try {
      const result = await STS.getCredential({
        secretId,
        secretKey,
        durationSeconds: 1800,
        policy,
      });

      return {
        tmpSecretId: result.credentials.tmpSecretId,
        tmpSecretKey: result.credentials.tmpSecretKey,
        sessionToken: result.credentials.sessionToken,
        startTime: result.startTime,
        expiredTime: result.expiredTime,
        bucket,
        region,
        publicBaseUrl,
        keyPrefix: 'products/',
      };
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to generate temporary COS credentials',
      );
    }
  }

  /**
   * Register a temporarily uploaded file in the database.
   * Expires after UPLOAD_TEMP_EXPIRE_HOURS (default 24h).
   */
  async registerTempUpload(dto: RegisterTempUploadDto) {
    const { bucket, region } = this.config;
    const expireHours = parseInt(
      process.env.UPLOAD_TEMP_EXPIRE_HOURS || '24',
      10,
    );
    const expiresAt = new Date(Date.now() + expireHours * 60 * 60 * 1000);

    return this.prisma.uploadFile.create({
      data: {
        provider: 'tencent-cos',
        bucket,
        region,
        objectKey: dto.objectKey,
        fileUrl: dto.fileUrl,
        originalFileName: dto.originalFileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        status: 'TEMP',
        expiresAt,
      },
    });
  }

  /**
   * Mark an upload as USED and link it to an entity.
   */
  async markAsUsed(uploadFileId: string, entityType: string, entityId: string) {
    return this.prisma.uploadFile.update({
      where: { id: uploadFileId },
      data: {
        status: 'USED',
        linkedEntityType: entityType,
        linkedEntityId: entityId,
        expiresAt: null,
      },
    });
  }
}
