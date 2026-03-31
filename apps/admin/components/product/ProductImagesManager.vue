<script setup lang="ts">
const props = defineProps<{
  productId: string;
}>();

const api = useAdminApi();
const { uploading, progress, uploadFiles } = useImageUpload();

interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  uploadFileId: string | null;
}

const images = ref<ProductImage[]>([]);
const loading = ref(false);
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

  error.value = '';

  try {
    const results = await uploadFiles(files);

    if (results.length > 0) {
      await api.post(`/api/admin/products/${props.productId}/images`, {
        images: results.map((r) => ({
          imageUrl: r.imageUrl,
          uploadFileId: r.uploadFileId,
        })),
      });
      ElMessage.success(`已上传 ${results.length} 张图片`);
      await loadImages();
    }
  } catch (err: any) {
    error.value = err?.message || '上传失败';
    ElMessage.error(err?.message || '上传失败');
  } finally {
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
        {{ uploading ? `上传中 ${progress}%` : '+ 上传图片' }}
      </ElButton>
      <span class="text-subdued text-sm">支持 JPG/PNG/WebP/GIF/BMP，最大 10MB，自动转为 JPG</span>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
        multiple
        :disabled="uploading"
        style="display: none"
        @change="handleUpload"
      />
    </div>

    <ElProgress v-if="uploading" :percentage="progress" :stroke-width="4" style="margin-bottom: 12px" />

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
