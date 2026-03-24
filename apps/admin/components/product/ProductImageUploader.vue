<script setup lang="ts">
import COS from 'cos-js-sdk-v5';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const api = useAdminApi();

const uploading = ref(false);
const uploadError = ref('');
const progress = ref(0);

const previewUrl = computed(() => props.modelValue);

interface StsResponse {
  tmpSecretId: string;
  tmpSecretKey: string;
  sessionToken: string;
  startTime: number;
  expiredTime: number;
  bucket: string;
  region: string;
  publicBaseUrl: string;
  keyPrefix: string;
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Please select an image file';
    return;
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    uploadError.value = 'Image must be smaller than 10MB';
    return;
  }

  uploading.value = true;
  uploadError.value = '';
  progress.value = 0;

  try {
    // Get temporary credentials from backend
    const sts = await api.get<StsResponse>('/api/admin/uploads/cos-sts');

    // Initialize COS client with temporary credentials
    const cos = new COS({
      SecretId: sts.tmpSecretId,
      SecretKey: sts.tmpSecretKey,
      SecurityToken: sts.sessionToken,
    });

    // Generate object key
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const key = `${sts.keyPrefix}${timestamp}-${rand}.${ext}`;

    // Upload to COS
    await new Promise<void>((resolve, reject) => {
      cos.uploadFile(
        {
          Bucket: sts.bucket,
          Region: sts.region,
          Key: key,
          Body: file,
          onProgress: (info: { percent: number }) => {
            progress.value = Math.round(info.percent * 100);
          },
        },
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });

    // Construct public URL
    const publicUrl = sts.publicBaseUrl
      ? `${sts.publicBaseUrl.replace(/\/$/, '')}/${key}`
      : `https://${sts.bucket}.cos.${sts.region}.myqcloud.com/${key}`;

    emit('update:modelValue', publicUrl);
  } catch (err: any) {
    uploadError.value = err?.message || 'Upload failed';
  } finally {
    uploading.value = false;
    progress.value = 0;
    // Reset file input
    input.value = '';
  }
}
</script>

<template>
  <div class="image-uploader">
    <div class="preview-area">
      <img v-if="previewUrl" :src="previewUrl" alt="Cover image" class="preview-img" />
      <div v-else class="preview-placeholder">No image</div>
    </div>

    <div class="upload-controls">
      <label class="upload-btn" :class="{ disabled: uploading }">
        {{ uploading ? `Uploading ${progress}%` : 'Upload Image' }}
        <input
          type="file"
          accept="image/*"
          :disabled="uploading"
          class="file-input"
          @change="handleFileChange"
        />
      </label>

      <div class="url-input">
        <input
          :value="modelValue"
          placeholder="Or paste image URL..."
          @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div v-if="uploadError" class="upload-error">{{ uploadError }}</div>
    </div>
  </div>
</template>

<style scoped>
.image-uploader {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.preview-area {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  background: #f9fafb;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
  font-size: 0.8rem;
}

.upload-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-btn {
  display: inline-block;
  padding: 8px 16px;
  background: #1a1a2e;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  text-align: center;
  width: fit-content;
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

.url-input input {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  box-sizing: border-box;
}

.upload-error {
  font-size: 0.8rem;
  color: #b91c1c;
}
</style>
