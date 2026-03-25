<script setup lang="ts">
import COS from 'cos-js-sdk-v5';

const props = defineProps<{
  productId: string;
}>();

const api = useAdminApi();

interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  uploadFileId: string | null;
}

interface StsResponse {
  tmpSecretId: string;
  tmpSecretKey: string;
  sessionToken: string;
  bucket: string;
  region: string;
  publicBaseUrl: string;
  keyPrefix: string;
}

const images = ref<ProductImage[]>([]);
const loading = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const error = ref('');

async function loadImages() {
  loading.value = true;
  try {
    images.value = await api.get<ProductImage[]>(
      `/api/admin/products/${props.productId}/images`,
    );
  } catch {
    error.value = 'Failed to load images';
  } finally {
    loading.value = false;
  }
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;

  uploading.value = true;
  uploadProgress.value = 0;
  error.value = '';

  try {
    const sts = await api.get<StsResponse>('/api/admin/uploads/cos-sts');
    const cos = new COS({
      SecretId: sts.tmpSecretId,
      SecretKey: sts.tmpSecretKey,
      SecurityToken: sts.sessionToken,
    });

    const newImages: { imageUrl: string; uploadFileId?: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) continue;

      const ext = file.name.split('.').pop() || 'jpg';
      const key = `${sts.keyPrefix}${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      await new Promise<void>((resolve, reject) => {
        cos.putObject(
          {
            Bucket: sts.bucket,
            Region: sts.region,
            Key: key,
            Body: file,
            onProgress: (info: { percent: number }) => {
              uploadProgress.value = Math.round(
                ((i + info.percent) / files.length) * 100,
              );
            },
          },
          (err: Error | null) => (err ? reject(err) : resolve()),
        );
      });

      const publicUrl = sts.publicBaseUrl
        ? `${sts.publicBaseUrl.replace(/\/$/, '')}/${key}`
        : `https://${sts.bucket}.cos.${sts.region}.myqcloud.com/${key}`;

      // Register temp upload
      const uploadRecord = await api.post<{ id: string }>(
        '/api/admin/uploads/register-temp',
        {
          objectKey: key,
          fileUrl: publicUrl,
          originalFileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      );

      newImages.push({
        imageUrl: publicUrl,
        uploadFileId: uploadRecord.id,
      });
    }

    if (newImages.length > 0) {
      await api.post(`/api/admin/products/${props.productId}/images`, {
        images: newImages,
      });
      await loadImages();
    }
  } catch (err: any) {
    error.value = err?.message || 'Upload failed';
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
    input.value = '';
  }
}

async function setPrimary(imageId: string) {
  try {
    await api.patch(
      `/api/admin/products/${props.productId}/images/${imageId}/primary`,
    );
    await loadImages();
  } catch {
    error.value = 'Failed to set primary image';
  }
}

async function moveImage(imageId: string, direction: 'up' | 'down') {
  const idx = images.value.findIndex((img) => img.id === imageId);
  if (idx < 0) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= images.value.length) return;

  const reordered = [...images.value];
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

  const items = reordered.map((img, i) => ({ id: img.id, sortOrder: i }));

  try {
    images.value = await api.patch<ProductImage[]>(
      `/api/admin/products/${props.productId}/images/reorder`,
      { items },
    );
  } catch {
    error.value = 'Failed to reorder';
  }
}

async function removeImage(imageId: string) {
  if (!confirm('Remove this image from the product?')) return;
  try {
    await api.del(
      `/api/admin/products/${props.productId}/images/${imageId}`,
    );
    await loadImages();
  } catch {
    error.value = 'Failed to remove image';
  }
}

onMounted(loadImages);
</script>

<template>
  <div class="images-manager">
    <div class="manager-header">
      <h3>Product Images</h3>
      <label class="upload-btn" :class="{ disabled: uploading }">
        {{ uploading ? `Uploading ${uploadProgress}%` : '+ Upload Images' }}
        <input
          type="file"
          accept="image/*"
          multiple
          :disabled="uploading"
          class="file-input"
          @change="handleUpload"
        />
      </label>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div v-if="loading" class="loading-msg">Loading images...</div>

    <div v-else-if="images.length === 0" class="empty-msg">
      No images yet. Upload some above.
    </div>

    <div v-else class="image-list">
      <div
        v-for="(img, idx) in images"
        :key="img.id"
        class="image-item"
        :class="{ primary: img.isPrimary }"
      >
        <div class="image-thumb">
          <img :src="img.imageUrl" :alt="img.altText || 'Product image'" />
          <span v-if="img.isPrimary" class="primary-badge">Primary</span>
        </div>
        <div class="image-actions">
          <button
            v-if="!img.isPrimary"
            class="action-btn"
            title="Set as primary"
            @click="setPrimary(img.id)"
          >
            ★ Primary
          </button>
          <button
            class="action-btn"
            :disabled="idx === 0"
            title="Move up"
            @click="moveImage(img.id, 'up')"
          >
            ↑
          </button>
          <button
            class="action-btn"
            :disabled="idx === images.length - 1"
            title="Move down"
            @click="moveImage(img.id, 'down')"
          >
            ↓
          </button>
          <button
            class="action-btn danger"
            title="Remove"
            @click="removeImage(img.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.images-manager {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.manager-header h3 {
  margin: 0;
  font-size: 0.95rem;
}

.upload-btn {
  display: inline-block;
  padding: 6px 14px;
  background: #1a1a2e;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.upload-btn:hover:not(.disabled) {
  background: #2d2d4e;
}

.upload-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.file-input {
  display: none;
}

.error-msg {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  margin-bottom: 12px;
}

.loading-msg,
.empty-msg {
  color: #999;
  font-size: 0.85rem;
  text-align: center;
  padding: 20px 0;
}

.image-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}

.image-item.primary {
  border-color: #3b82f6;
  background: #eff6ff;
}

.image-thumb {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: #f9fafb;
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.primary-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(59, 130, 246, 0.9);
  color: #fff;
  font-size: 0.65rem;
  text-align: center;
  padding: 1px 0;
}

.image-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 4px 8px;
  font-size: 0.75rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
}

.action-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn.danger {
  color: #b91c1c;
  border-color: #fca5a5;
}

.action-btn.danger:hover {
  background: #fef2f2;
}
</style>
