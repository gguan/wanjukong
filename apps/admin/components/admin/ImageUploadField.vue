<script setup lang="ts">
const props = defineProps<{
  modelValue: string | null;
  prefix?: string;
  brandSlug?: string;
  productSlug?: string;
  filenamePrefix?: string;
  maxSizeMB?: number;
  label?: string;
  hint?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const { uploading, progress, uploadFiles } = useImageUpload({
  maxSizeMB: props.maxSizeMB ?? 5,
  prefix: props.prefix ?? 'products',
});

const dragging = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

function triggerUpload() {
  fileInputRef.value?.click();
}

function clear() {
  emit('update:modelValue', '');
}

async function doUpload(files: FileList | File[]) {
  const subdir = props.productSlug && props.brandSlug
    ? `${props.brandSlug}/${props.productSlug}`
    : props.brandSlug || '';

  if (props.prefix === 'products' && !props.brandSlug) {
    ElMessage.error('请先选择商品品牌后再上传图片');
    return;
  }

  try {
    const results = await uploadFiles(files, {
      subdir,
      filenamePrefix: props.filenamePrefix,
    });
    if (results.length > 0) {
      emit('update:modelValue', results[0].imageUrl);
      ElMessage.success('图片上传成功');
    }
  } catch (err: any) {
    ElMessage.error(err?.message || '上传失败');
  }
}

async function handleChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;
  await doUpload(files);
  input.value = '';
}

function onDragLeave(e: DragEvent) {
  const related = e.relatedTarget as Node | null;
  const current = e.currentTarget as Node;
  if (!current.contains(related)) dragging.value = false;
}

async function onDrop(e: DragEvent) {
  dragging.value = false;
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  await doUpload(files);
}
</script>

<template>
  <div>
    <!-- Preview -->
    <div v-if="modelValue" class="image-preview">
      <div class="image-preview__image">
        <img :src="modelValue" :alt="label || '预览'" />
      </div>
      <div class="image-preview__info">
        <div class="image-preview__url">{{ modelValue }}</div>
      </div>
      <ElButton size="small" type="danger" plain @click="clear">移除</ElButton>
    </div>

    <!-- Drop Zone -->
    <div
      class="drop-zone"
      :class="{ 'drop-zone--active': dragging, 'drop-zone--uploading': uploading }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
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
        <span class="drop-zone__text">{{ modelValue ? '替换图片' : (label || '点击或拖拽上传图片') }}</span>
        <span v-if="hint" class="drop-zone__hint">{{ hint }}</span>
      </div>
    </div>
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
      style="display: none"
      @change="handleChange"
    />
    <ElProgress v-if="uploading" :percentage="progress" :stroke-width="4" style="margin-top: 8px" />
  </div>
</template>

<style scoped>
.image-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  margin-bottom: 10px;
}
.image-preview__image {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid var(--el-border-color);
}
.image-preview__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-preview__info {
  flex: 1;
  min-width: 0;
}
.image-preview__url {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drop-zone {
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--el-fill-color-lighter);
}
.drop-zone:hover {
  border-color: var(--el-border-color-dark);
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
  font-size: 24px;
  color: var(--el-text-color-secondary);
  line-height: 1;
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
</style>
