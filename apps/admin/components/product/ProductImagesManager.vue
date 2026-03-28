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
const fileInputRef = ref<HTMLInputElement | null>(null);

function triggerUpload() {
  fileInputRef.value?.click();
}

async function loadImages() {
  loading.value = true;
  try {
    images.value = await api.get<ProductImage[]>(
      `/api/admin/products/${props.productId}/images`,
    );
  } catch {
    error.value = '加载图片失败';
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
      ElMessage.success(`已上传 ${newImages.length} 张图片`);
      await loadImages();
    }
  } catch (err: any) {
    error.value = err?.message || '上传失败';
    ElMessage.error('上传失败');
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
    ElMessage.success('主图已更新');
    await loadImages();
  } catch {
    error.value = '设置主图失败';
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
    error.value = '排序失败';
  }
}

async function removeImage(imageId: string) {
  try {
    await ElMessageBox.confirm('确认从商品中移除这张图片吗？', '提示', { type: 'warning' });
    await api.del(`/api/admin/products/${props.productId}/images/${imageId}`);
    ElMessage.success('图片已删除');
    await loadImages();
  } catch {}
}

onMounted(loadImages);
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
      <ElButton :loading="uploading" type="primary" size="small" @click="triggerUpload">
        {{ uploading ? `上传中 ${uploadProgress}%` : '+ 上传图片' }}
      </ElButton>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        multiple
        :disabled="uploading"
        style="display: none"
        @change="handleUpload"
      />
    </div>

    <ElProgress v-if="uploading" :percentage="uploadProgress" :stroke-width="4" style="margin-bottom: 12px" />

    <ElAlert v-if="error" :title="error" type="error" closable style="margin-bottom: 12px" @close="error = ''" />

    <div v-if="loading" v-loading="true" style="height: 100px" />

    <ElEmpty v-else-if="images.length === 0" description="暂无图片，请先上传。" />

    <div v-else style="display: flex; flex-direction: column; gap: 8px">
      <div
        v-for="(img, idx) in images"
        :key="img.id"
        style="display: flex; align-items: center; gap: 12px; padding: 8px; border: 1px solid var(--wk-admin-border); border-radius: 6px"
        :style="img.isPrimary ? { borderColor: '#409EFF', background: '#ecf5ff' } : {}"
      >
        <div style="position: relative; width: 72px; height: 72px; flex-shrink: 0; border-radius: 4px; overflow: hidden; background: #f5f7fa">
          <img :src="img.imageUrl" :alt="img.altText || '商品图片'" style="width: 100%; height: 100%; object-fit: cover" />
          <ElTag v-if="img.isPrimary" type="primary" size="small" style="position: absolute; bottom: 0; left: 0; right: 0; text-align: center; border-radius: 0">
            主图
          </ElTag>
        </div>
        <ElSpace wrap>
          <ElButton v-if="!img.isPrimary" size="small" @click="setPrimary(img.id)">★ 设为主图</ElButton>
          <ElButton size="small" :disabled="idx === 0" @click="moveImage(img.id, 'up')">↑</ElButton>
          <ElButton size="small" :disabled="idx === images.length - 1" @click="moveImage(img.id, 'down')">↓</ElButton>
          <ElButton size="small" type="danger" @click="removeImage(img.id)">✕</ElButton>
        </ElSpace>
      </div>
    </div>
  </div>
</template>
