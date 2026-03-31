<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();
const { uploading, progress, uploadFiles } = useImageUpload({ maxSizeMB: 5 });

interface Brand {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  logo: string | null;
  notes: string | null;
}

const brands = ref<Brand[]>([]);
const loading = ref(true);

const dialogVisible = ref(false);
const editing = ref<Brand | null>(null);
const form = ref({ name: '', slug: '', code: '', logo: '', notes: '' });

// Upload state
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
  const files = input.files;
  if (!files || files.length === 0) return;

  try {
    const results = await uploadFiles(files);
    if (results.length > 0) {
      form.value.logo = results[0].imageUrl;
      ElMessage.success('LOGO 上传成功');
    }
  } catch (err: any) {
    ElMessage.error(err?.message || '上传失败');
  } finally {
    input.value = '';
  }
}

function clearLogo() {
  form.value.logo = '';
}

const logoDragging = ref(false);

function onLogoDragLeave(e: DragEvent) {
  const related = e.relatedTarget as Node | null;
  const current = e.currentTarget as Node;
  if (!current.contains(related)) logoDragging.value = false;
}

async function onLogoDrop(e: DragEvent) {
  logoDragging.value = false;
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  try {
    const results = await uploadFiles(files);
    if (results.length > 0) {
      form.value.logo = results[0].imageUrl;
      ElMessage.success('LOGO 上传成功');
    }
  } catch (err: any) {
    ElMessage.error(err?.message || '上传失败');
  }
}

async function save() {
  if (!form.value.name || !form.value.slug) {
    ElMessage.error('品牌名称和 URL 标识为必填项');
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
    ElMessage.success(editing.value ? '品牌已更新' : '品牌已创建');
  } catch (err: any) {
    ElMessage.error(err?.message || '保存失败');
  }
}

async function remove(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该品牌吗？', '提示', { type: 'warning' });
    await api.del(`/api/admin/brands/${id}`);
    await load();
    ElMessage.success('品牌已删除');
  } catch {}
}

onMounted(load);
</script>

<template>
  <div>
    <AdminPageHeader title="品牌">
      <template #actions>
        <ElButton type="primary" @click="openCreate">+ 新建品牌</ElButton>
      </template>
    </AdminPageHeader>

    <!-- Dialog -->
    <ElDialog
      v-model="dialogVisible"
      :title="editing ? '编辑品牌' : '新建品牌'"
      width="520px"
      destroy-on-close
    >
      <ElForm label-position="top" @submit.prevent="save">
        <!-- Name + Slug -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
          <ElFormItem label="名称" required>
            <ElInput v-model="form.name" @input="onNameInput" />
          </ElFormItem>
          <ElFormItem label="URL 标识" required>
            <ElInput v-model="form.slug" placeholder="自动生成" />
          </ElFormItem>
        </div>

        <!-- Code -->
        <ElFormItem label="品牌编码">
          <ElInput v-model="form.code" placeholder="例如：HT、DAM、TZ" style="max-width: 160px" />
        </ElFormItem>

        <!-- Logo upload -->
        <ElFormItem label="品牌 LOGO">
          <div style="width: 100%">
            <!-- Preview -->
            <div
              v-if="form.logo"
              class="logo-preview"
            >
              <div class="logo-preview__image">
                <img :src="form.logo" alt="品牌 LOGO" />
              </div>
              <div class="logo-preview__info">
                <div class="logo-preview__url">{{ form.logo }}</div>
              </div>
              <ElButton size="small" type="danger" plain @click="clearLogo">移除</ElButton>
            </div>

            <!-- Drop Zone -->
            <div
              class="logo-drop-zone"
              :class="{ 'logo-drop-zone--active': logoDragging, 'logo-drop-zone--uploading': uploading }"
              @dragenter.prevent="logoDragging = true"
              @dragover.prevent="logoDragging = true"
              @dragleave.prevent="onLogoDragLeave"
              @drop.prevent="onLogoDrop"
              @click="triggerLogoUpload"
            >
              <div v-if="uploading" class="logo-drop-zone__content">
                <span class="logo-drop-zone__icon">&#8635;</span>
                <span class="logo-drop-zone__text">上传中 {{ progress }}%</span>
              </div>
              <div v-else-if="logoDragging" class="logo-drop-zone__content">
                <span class="logo-drop-zone__icon">&#8615;</span>
                <span class="logo-drop-zone__text">松开即可上传</span>
              </div>
              <div v-else class="logo-drop-zone__content">
                <span class="logo-drop-zone__icon">&#43;</span>
                <span class="logo-drop-zone__text">{{ form.logo ? '替换 LOGO' : '点击或拖拽上传 LOGO' }}</span>
                <span class="logo-drop-zone__hint">支持 JPG/PNG/WebP，最大 5MB，自动转为 JPG</span>
              </div>
            </div>
            <input
              ref="logoFileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
              style="display: none"
              @change="handleLogoUpload"
            />
            <ElProgress v-if="uploading" :percentage="progress" :stroke-width="4" style="margin-top: 8px" />
          </div>
        </ElFormItem>

        <!-- Notes -->
        <ElFormItem label="备注">
          <ElInput
            v-model="form.notes"
            type="textarea"
            :rows="3"
            placeholder="仅后台可见的品牌备注（前台不展示）"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="uploading" @click="save">保存</ElButton>
      </template>
    </ElDialog>

    <!-- Table -->
    <ElTable v-loading="loading" :data="brands" stripe>
      <ElTableColumn label="LOGO" width="72">
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
      <ElTableColumn prop="name" label="名称" />
      <ElTableColumn prop="slug" label="URL 标识">
        <template #default="{ row }">
          <ElTag size="small" type="info" disable-transitions>{{ row.slug }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="code" label="编码" width="80" />
      <ElTableColumn prop="notes" label="备注" show-overflow-tooltip>
        <template #default="{ row }">
          <span style="color: #909399; font-size: 12px">{{ row.notes || '—' }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="140" align="right">
        <template #default="{ row }">
          <ElButton size="small" @click="openEdit(row)">编辑</ElButton>
          <ElButton size="small" type="danger" @click="remove(row.id)">删除</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="暂无品牌" />
      </template>
    </ElTable>
  </div>
</template>

<style scoped>
.logo-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  margin-bottom: 10px;
}

.logo-preview__image {
  width: 56px;
  height: 56px;
  background: #fff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.logo-preview__image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.logo-preview__info {
  flex: 1;
  min-width: 0;
}

.logo-preview__url {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logo-drop-zone {
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--el-fill-color-lighter);
}

.logo-drop-zone:hover {
  border-color: var(--el-border-color-dark);
  background: var(--el-fill-color-light);
}

.logo-drop-zone--active {
  border-color: #005bd3;
  background: #eef4fd;
  border-style: solid;
}

.logo-drop-zone--uploading {
  pointer-events: none;
  opacity: 0.7;
}

.logo-drop-zone__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.logo-drop-zone__icon {
  font-size: 24px;
  color: var(--el-text-color-secondary);
  line-height: 1;
}

.logo-drop-zone--active .logo-drop-zone__icon {
  color: #005bd3;
}

.logo-drop-zone__text {
  font-size: 13px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.logo-drop-zone__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
