import { Injectable, InternalServerErrorException } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const STS = require('qcloud-cos-sts');

@Injectable()
export class UploadsService {
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
    const shortBucketName = bucket.replace(`-${appId}`, '');

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
            `qcs::cos:${region}:uid/${appId}:${shortBucketName}-${appId}/products/*`,
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
}
