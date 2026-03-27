<script setup lang="ts">
import COS from 'cos-js-sdk-v5';

definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();

interface Brand {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  logo: string | null;
  notes: string | null;
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

const brands = ref<Brand[]>([]);
const loading = ref(true);

const dialogVisible = ref(false);
const editing = ref<Brand | null>(null);
const form = ref({ name: '', slug: '', code: '', logo: '', notes: '' });

// Upload state
const uploading = ref(false);
const uploadProgress = ref(0);
const logoFileInputRef = ref<HTMLInputElement | null>(null);

async function load() {
  loading.value = true;
  brands.value = await api.get('/api/admin/brands');
  loading.value = false;
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', slug: '', code: '', logo: '', notes: '' };
  dialogVisible.value = true;
}

function openEdit(b: Brand) {
  editing.value = b;
  form.value = {
    name: b.name,
    slug: b.slug,
    code: b.code || '',
    logo: b.logo || '',
    notes: b.notes || '',
  };
  dialogVisible.value = true;
}

// Auto-generate slug from name
function onNameInput(val: string) {
  if (!editing.value) {
    form.value.slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

function triggerLogoUpload() {
  logoFileInputRef.value?.click();
}

async function handleLogoUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    ElMessage.error('Please select an image file');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('Image must be under 5 MB');
    return;
  }

  uploading.value = true;
  uploadProgress.value = 0;

  try {
    const sts = await api.get<StsResponse>('/api/admin/uploads/cos-sts?prefix=brands');
    const cos = new COS({
      SecretId: sts.tmpSecretId,
      SecretKey: sts.tmpSecretKey,
      SecurityToken: sts.sessionToken,
    });

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
            uploadProgress.value = Math.round(info.percent * 100);
          },
        },
        (err: Error | null) => (err ? reject(err) : resolve()),
      );
    });

    const publicUrl = sts.publicBaseUrl
      ? `${sts.publicBaseUrl.replace(/\/$/, '')}/${key}`
      : `https://${sts.bucket}.cos.${sts.region}.myqcloud.com/${key}`;

    await api.post('/api/admin/uploads/register-temp', {
      objectKey: key,
      fileUrl: publicUrl,
      originalFileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    form.value.logo = publicUrl;
    ElMessage.success('Logo uploaded');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Upload failed');
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
    input.value = '';
  }
}

function clearLogo() {
  form.value.logo = '';
}

async function save() {
  if (!form.value.name || !form.value.slug) {
    ElMessage.error('Name and Slug are required');
    return;
  }
  try {
    if (editing.value) {
      await api.put(`/api/admin/brands/${editing.value.id}`, form.value);
    } else {
      await api.post('/api/admin/brands', form.value);
    }
    dialogVisible.value = false;
    await load();
    ElMessage.success(editing.value ? 'Brand updated' : 'Brand created');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Save failed');
  }
}

async function remove(id: string) {
  try {
    await ElMessageBox.confirm('Delete this brand?', 'Confirm', { type: 'warning' });
    await api.del(`/api/admin/brands/${id}`);
    await load();
    ElMessage.success('Brand deleted');
  } catch {}
}

onMounted(load);
</script>

<template>
  <div>
    <AdminPageHeader title="Brands">
      <template #actions>
        <ElButton type="primary" @click="openCreate">+ New Brand</ElButton>
      </template>
    </AdminPageHeader>

    <!-- Dialog -->
    <ElDialog
      v-model="dialogVisible"
      :title="editing ? 'Edit Brand' : 'New Brand'"
      width="520px"
      destroy-on-close
    >
      <ElForm label-position="top" @submit.prevent="save">
        <!-- Name + Slug -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
          <ElFormItem label="Name" required>
            <ElInput v-model="form.name" @input="onNameInput" />
          </ElFormItem>
          <ElFormItem label="Slug" required>
            <ElInput v-model="form.slug" placeholder="auto-generated" />
          </ElFormItem>
        </div>

        <!-- Code -->
        <ElFormItem label="Brand Code">
          <ElInput v-model="form.code" placeholder="e.g. HT, DAM, TZ" style="max-width: 160px" />
        </ElFormItem>

        <!-- Logo upload -->
        <ElFormItem label="Logo">
          <div style="display: flex; flex-direction: column; gap: 10px; width: 100%">
            <!-- Preview -->
            <div
              v-if="form.logo"
              style="display: flex; align-items: center; gap: 12px; padding: 10px; background: #f5f7fa; border-radius: 6px; border: 1px solid #e4e7ed"
            >
              <div style="width: 56px; height: 56px; background: #fff; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #eee; flex-shrink: 0">
                <img :src="form.logo" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain" />
              </div>
              <div style="flex: 1; min-width: 0">
                <div style="font-size: 12px; color: #606266; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ form.logo }}</div>
              </div>
              <ElButton size="small" type="danger" plain @click="clearLogo">Remove</ElButton>
            </div>

            <!-- Upload button -->
            <div style="display: flex; align-items: center; gap: 8px">
              <ElButton
                size="small"
                :loading="uploading"
                @click="triggerLogoUpload"
              >
                {{ uploading ? `Uploading ${uploadProgress}%` : form.logo ? 'Replace Logo' : 'Upload Logo' }}
              </ElButton>
              <ElProgress
                v-if="uploading"
                :percentage="uploadProgress"
                :stroke-width="4"
                style="flex: 1"
              />
              <input
                ref="logoFileInputRef"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleLogoUpload"
              />
            </div>
          </div>
        </ElFormItem>

        <!-- Notes -->
        <ElFormItem label="Notes">
          <ElInput
            v-model="form.notes"
            type="textarea"
            :rows="3"
            placeholder="Internal notes about this brand (not shown to customers)"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="dialogVisible = false">Cancel</ElButton>
        <ElButton type="primary" :loading="uploading" @click="save">Save</ElButton>
      </template>
    </ElDialog>

    <!-- Table -->
    <ElTable v-loading="loading" :data="brands" stripe>
      <ElTableColumn label="Logo" width="72">
        <template #default="{ row }">
          <div style="width: 40px; height: 40px; background: #f5f7fa; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden">
            <img
              v-if="row.logo"
              :src="row.logo"
              :alt="row.name"
              style="max-width: 100%; max-height: 100%; object-fit: contain"
            />
            <span v-else style="color: #ccc; font-size: 10px">—</span>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="name" label="Name" />
      <ElTableColumn prop="slug" label="Slug">
        <template #default="{ row }">
          <ElTag size="small" type="info" disable-transitions>{{ row.slug }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="code" label="Code" width="80" />
      <ElTableColumn prop="notes" label="Notes" show-overflow-tooltip>
        <template #default="{ row }">
          <span style="color: #909399; font-size: 12px">{{ row.notes || '—' }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Actions" width="140" align="right">
        <template #default="{ row }">
          <ElButton size="small" @click="openEdit(row)">Edit</ElButton>
          <ElButton size="small" type="danger" @click="remove(row.id)">Delete</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="No brands yet" />
      </template>
    </ElTable>
  </div>
</template>
