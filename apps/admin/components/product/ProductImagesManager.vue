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
const dragging = ref(false);

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

async function doUpload(files: FileList | File[]) {
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
  }
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;
  await doUpload(files);
  input.value = '';
}

// ─── Drag & Drop ────────────────────────────

function onDragEnter(e: DragEvent) {
  e.preventDefault();
  dragging.value = true;
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  dragging.value = true;
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  // Only unset if leaving the drop zone itself (not a child)
  const relatedTarget = e.relatedTarget as Node | null;
  const currentTarget = e.currentTarget as Node;
  if (!currentTarget.contains(relatedTarget)) {
    dragging.value = false;
  }
}

async function onDrop(e: DragEvent) {
  e.preventDefault();
  dragging.value = false;
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  await doUpload(files);
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
    <!-- Drop Zone -->
    <div
      class="drop-zone"
      :class="{ 'drop-zone--active': dragging, 'drop-zone--uploading': uploading }"
      @dragenter="onDragEnter"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="triggerUpload"
    >
      <div v-if="uploading" class="drop-zone__content">
        <span class="drop-zone__icon">&#8635;</span>
        <span class="drop-zone__text">上传中 {{ progress }}%</span>
      </div>
      <div v-else-if="dragging" class="drop-zone__content">
        <span class="drop-zone__icon">&#8615;</span>
        <span class="drop-zone__text">松开即可上传</span>
      </div>
      <div v-else class="drop-zone__content">
        <span class="drop-zone__icon">&#43;</span>
        <span class="drop-zone__text">点击或拖拽图片到此处上传</span>
        <span class="drop-zone__hint">支持 JPG/PNG/WebP/GIF/BMP，最大 10MB，自动转为 JPG</span>
      </div>
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

    <ElProgress v-if="uploading" :percentage="progress" :stroke-width="4" style="margin: 12px 0" />

    <ElAlert v-if="error" :title="error" type="error" closable style="margin-bottom: 12px" @close="error = ''" />

    <div v-if="loading" v-loading="true" style="height: 100px" />

    <ElEmpty v-else-if="images.length === 0" description="暂无图片，拖拽或点击上方区域上传。" />

    <div v-else class="image-list">
      <div
        v-for="(img, idx) in images"
        :key="img.id"
        class="image-item"
        :class="{ 'image-item--primary': img.isPrimary }"
      >
        <div class="image-item__thumb">
          <img :src="img.imageUrl" :alt="img.altText || '商品图片'" />
          <span v-if="img.isPrimary" class="image-item__badge">主图</span>
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

<style scoped>
.drop-zone {
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 12px;
  background: var(--el-fill-color-lighter);
}

.drop-zone:hover {
  border-color: var(--el-border-color-dark);
  background: var(--el-fill-color-light);
}

.drop-zone--active {
  border-color: #005bd3;
  background: #eef4fd;
  border-style: solid;
}

.drop-zone--uploading {
  pointer-events: none;
  opacity: 0.7;
}

.drop-zone__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.drop-zone__icon {
  font-size: 28px;
  color: var(--el-text-color-secondary);
  line-height: 1;
}

.drop-zone--active .drop-zone__icon {
  color: #005bd3;
}

.drop-zone__text {
  font-size: 13px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.drop-zone__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* Image List */
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
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}

.image-item--primary {
  border-color: #409EFF;
  background: #ecf5ff;
}

.image-item__thumb {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f7fa;
}

.image-item__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-item__badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  background: #409EFF;
  padding: 1px 0;
}
</style>
