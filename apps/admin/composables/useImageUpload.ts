import COS from 'cos-js-sdk-v5';

interface StsResponse {
  tmpSecretId: string;
  tmpSecretKey: string;
  sessionToken: string;
  bucket: string;
  region: string;
  publicBaseUrl: string;
  keyPrefix: string;
}

interface UploadResult {
  imageUrl: string;
  uploadFileId: string;
}

interface UploadOptions {
  /** Max file size in MB (default: 5) */
  maxSizeMB?: number;
  /** JPG quality 0-1 (default: 0.9) */
  jpgQuality?: number;
  /** Allowed mime types (default: common image types) */
  allowedTypes?: string[];
  /** COS key prefix / directory (default: 'products') */
  prefix?: string;
}

/**
 * Per-upload path options.
 * - `subdir` adds subdirectories under the prefix: `{prefix}/{subdir}/{filename}`
 * - `filenamePrefix` prepends to the filename: `{prefix}/{filenamePrefix}-{timestamp}-{rand}.jpg`
 */
export interface UploadPathOptions {
  subdir?: string;
  filenamePrefix?: string;
}

function sanitizeSlug(s: string): string {
  return s.replace(/[^a-z0-9-/]/gi, '').toLowerCase();
}

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/bmp', 'image/tiff', 'image/gif',
];

/**
 * Load a file into an Image element (validates it's a real image).
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width < 10 || img.height < 10) {
        reject(new Error('图片尺寸过小'));
      } else {
        resolve(img);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取图片，文件可能已损坏或不是有效的图片格式'));
    };
    img.src = url;
  });
}

/**
 * Convert an image to JPG using canvas (no resizing).
 * Returns a Blob in JPEG format.
 */
function convertToJpg(img: HTMLImageElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    // White background (for transparent PNGs)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('图片转换失败'));
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Composable for image upload with validation and JPG conversion.
 *
 * Features:
 * - Validates file type (only images allowed)
 * - Validates file size (default 5MB max)
 * - Validates actual image data (prevents disguised files)
 * - Auto-converts all images to JPG via canvas
 * - Uploads to Tencent COS with STS temporary credentials
 */
export function useImageUpload(options: UploadOptions = {}) {
  const {
    maxSizeMB = 5,
    jpgQuality = 0.9,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    prefix = 'products',
  } = options;

  const api = useAdminApi();
  const uploading = ref(false);
  const progress = ref(0);

  /**
   * Validate + convert + upload files. Returns uploaded image records.
   * Throws user-friendly error messages.
   */
  async function uploadFiles(
    files: FileList | File[],
    pathOpts: UploadPathOptions = {},
  ): Promise<UploadResult[]> {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return [];

    const subdir = pathOpts.subdir ? sanitizeSlug(pathOpts.subdir) : '';
    const filenamePrefix = pathOpts.filenamePrefix ? sanitizeSlug(pathOpts.filenamePrefix) : '';
    const fullPrefix = subdir ? `${prefix}/${subdir}` : prefix;

    // Pre-validate all files before uploading any
    const errors: string[] = [];
    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`「${file.name}」不是支持的图片格式（支持 JPG/PNG/WebP/GIF/BMP）`);
      } else if (file.size > maxSizeMB * 1024 * 1024) {
        errors.push(`「${file.name}」文件过大（最大 ${maxSizeMB}MB，当前 ${(file.size / 1024 / 1024).toFixed(1)}MB）`);
      }
    }
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    uploading.value = true;
    progress.value = 0;

    try {
      // Get STS credentials scoped to full prefix (incl. subdir)
      const sts = await api.get<StsResponse>(`/api/admin/uploads/cos-sts?prefix=${encodeURIComponent(fullPrefix)}`);
      const cos = new COS({
        SecretId: sts.tmpSecretId,
        SecretKey: sts.tmpSecretKey,
        SecurityToken: sts.sessionToken,
      });

      const results: UploadResult[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];

        // Validate image data (loads into Image element)
        const img = await loadImage(file);

        // Convert to JPG
        const jpgBlob = await convertToJpg(img, jpgQuality);

        // Generate key: {prefix}/{filenamePrefix-}{timestamp}-{rand}.jpg
        const rand = Math.random().toString(36).substring(2, 8);
        const filename = filenamePrefix
          ? `${filenamePrefix}-${Date.now()}-${rand}.jpg`
          : `${Date.now()}-${rand}.jpg`;
        const key = `${sts.keyPrefix}${filename}`;

        // Upload to COS
        await new Promise<void>((resolve, reject) => {
          cos.putObject(
            {
              Bucket: sts.bucket,
              Region: sts.region,
              Key: key,
              Body: jpgBlob,
              onProgress: (info: { percent: number }) => {
                progress.value = Math.round(((i + info.percent) / fileArray.length) * 100);
              },
            },
            (err: any) => (err ? reject(err) : resolve()),
          );
        });

        const publicUrl = sts.publicBaseUrl
          ? `${sts.publicBaseUrl.replace(/\/$/, '')}/${key}`
          : `https://${sts.bucket}.cos.${sts.region}.myqcloud.com/${key}`;

        // Register in backend
        const uploadRecord = await api.post<{ id: string }>(
          '/api/admin/uploads/register-temp',
          {
            objectKey: key,
            fileUrl: publicUrl,
            originalFileName: file.name.replace(/\.[^.]+$/, '.jpg'),
            mimeType: 'image/jpeg',
            sizeBytes: jpgBlob.size,
          },
        );

        results.push({
          imageUrl: publicUrl,
          uploadFileId: uploadRecord.id,
        });
      }

      return results;
    } finally {
      uploading.value = false;
      progress.value = 0;
    }
  }

  return {
    uploading: readonly(uploading),
    progress: readonly(progress),
    uploadFiles,
  };
}
