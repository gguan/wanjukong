<script setup lang="ts">
const props = defineProps<{ productId: string }>();
const api = useAdminApi();

interface Variant {
  id: string;
  name: string;
  sku: string;
  manufacturerSku: string | null;
  priceCents: number;
  stock: number;
  subtitle: string | null;
  specifications: string | null;
  isDefault: boolean;
  sortOrder: number;
  coverImageUrl: string | null;
}

const variants = ref<Variant[]>([]);
const loading = ref(false);
const error = ref('');
const expandedIds = ref<Set<string>>(new Set());

// New variant creation
const showNewForm = ref(false);
const newForm = reactive({
  name: '',
  sku: '',
  manufacturerSku: '',
  priceCents: 0,
  stock: 0,
  subtitle: '',
  specifications: '',
  sortOrder: 0,
  coverImageUrl: '',
});
const creatingNew = ref(false);

function resetNewForm() {
  newForm.name = '';
  newForm.sku = '';
  newForm.manufacturerSku = '';
  newForm.priceCents = 0;
  newForm.stock = 0;
  newForm.subtitle = '';
  newForm.specifications = '';
  newForm.sortOrder = variants.value.length;
  newForm.coverImageUrl = '';
}

async function loadVariants() {
  loading.value = true;
  try {
    variants.value = await api.get<Variant[]>(
      `/api/admin/products/${props.productId}/variants`,
    );
    // Auto-expand default variant
    const defaultV = variants.value.find((v) => v.isDefault);
    if (defaultV && expandedIds.value.size === 0) {
      expandedIds.value.add(defaultV.id);
    }
  } catch {
    error.value = '加载版本失败';
  } finally {
    loading.value = false;
  }
}

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id);
  } else {
    expandedIds.value.add(id);
  }
}

async function saveVariant(id: string, data: Partial<Variant>) {
  error.value = '';
  try {
    await api.patch(
      `/api/admin/products/${props.productId}/variants/${id}`,
      data,
    );
    ElMessage.success('版本已更新');
    await loadVariants();
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || '保存版本失败';
  }
}

async function createVariant() {
  error.value = '';
  creatingNew.value = true;
  try {
    const payload = {
      ...newForm,
      priceCents: Number(newForm.priceCents),
      stock: Number(newForm.stock),
      sortOrder: Number(newForm.sortOrder),
      sku: newForm.sku || undefined,
      manufacturerSku: newForm.manufacturerSku || undefined,
      subtitle: newForm.subtitle || undefined,
      specifications: newForm.specifications || undefined,
      coverImageUrl: newForm.coverImageUrl || undefined,
    };
    const created = await api.post<Variant>(
      `/api/admin/products/${props.productId}/variants`,
      payload,
    );
    ElMessage.success('版本已创建');
    showNewForm.value = false;
    resetNewForm();
    await loadVariants();
    // Auto-expand new variant
    if (created?.id) {
      expandedIds.value.add(created.id);
    }
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || '创建版本失败';
  } finally {
    creatingNew.value = false;
  }
}

async function deleteVariant(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该版本吗？', '提示', { type: 'warning' });
    await api.del(`/api/admin/products/${props.productId}/variants/${id}`);
    ElMessage.success('版本已删除');
    expandedIds.value.delete(id);
    await loadVariants();
  } catch (e: any) {
    if (e !== 'cancel') {
      error.value = e?.data?.message || '删除版本失败';
    }
  }
}

async function setDefault(id: string) {
  try {
    await api.patch(
      `/api/admin/products/${props.productId}/variants/${id}`,
      { isDefault: true },
    );
    ElMessage.success('默认版本已更新');
    await loadVariants();
  } catch {
    error.value = '设置默认版本失败';
  }
}

function startCreate() {
  resetNewForm();
  showNewForm.value = true;
}

onMounted(loadVariants);
</script>

<template>
  <div>
    <ElAlert v-if="error" :title="error" type="error" closable style="margin-bottom: 12px" @close="error = ''" />

    <div v-if="loading" v-loading="true" style="height: 100px" />

    <template v-else>
      <!-- Variant cards -->
      <div v-if="variants.length > 0" style="display: flex; flex-direction: column; gap: 12px">
        <ProductVariantEditorCard
          v-for="v in variants"
          :key="v.id"
          :variant="v"
          :expanded="expandedIds.has(v.id)"
          @toggle="toggleExpand(v.id)"
          @save="(data) => saveVariant(v.id, data)"
          @delete="deleteVariant(v.id)"
          @set-default="setDefault(v.id)"
        />
      </div>

      <ElEmpty v-else-if="!showNewForm" description="暂无版本" />

      <!-- New variant inline form -->
      <div v-if="showNewForm" class="variant-card" style="margin-top: 12px">
        <div class="variant-card__header" style="cursor: default">
          <div class="variant-card__header-left">
            <span class="variant-card__name">新建版本</span>
          </div>
          <div class="variant-card__actions">
            <ElButton size="small" text @click="showNewForm = false">取消</ElButton>
          </div>
        </div>
        <div class="variant-card__body">
          <ElForm label-position="top">
            <div class="form-grid form-grid--2">
              <ElFormItem label="版本名称" required>
                <ElInput v-model="newForm.name" placeholder="例如：豪华版、限定版" />
              </ElFormItem>
              <ElFormItem label="排序值">
                <ElInputNumber v-model="newForm.sortOrder" :min="0" style="width: 100%" />
              </ElFormItem>
            </div>
            <div class="form-grid form-grid--2">
              <ElFormItem label="货号">
                <ElInput v-model="newForm.sku" placeholder="留空自动生成" />
                <div class="field-hint">留空后系统自动生成</div>
              </ElFormItem>
              <ElFormItem label="厂商货号">
                <ElInput v-model="newForm.manufacturerSku" placeholder="例如：MMS617" />
              </ElFormItem>
            </div>
            <div class="form-grid form-grid--2">
              <ElFormItem label="价格（分）" required>
                <ElInputNumber v-model="newForm.priceCents" :min="0" style="width: 100%" />
              </ElFormItem>
              <ElFormItem label="库存">
                <ElInputNumber v-model="newForm.stock" :min="0" style="width: 100%" />
              </ElFormItem>
            </div>
            <ElFormItem label="副标题">
              <ElInput v-model="newForm.subtitle" placeholder="例如：含额外配件..." />
            </ElFormItem>
            <ElFormItem label="封面图链接">
              <ElInput v-model="newForm.coverImageUrl" placeholder="可选的版本专属图片" />
            </ElFormItem>
            <ElFormItem label="说明信息">
              <ProductRichTextEditor v-model="newForm.specifications" />
            </ElFormItem>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px">
              <ElButton @click="showNewForm = false">取消</ElButton>
              <ElButton type="primary" :loading="creatingNew" @click="createVariant">创建版本</ElButton>
            </div>
          </ElForm>
        </div>
      </div>

      <!-- Add version button -->
      <div v-if="!showNewForm" style="margin-top: 12px">
        <ElButton @click="startCreate">+ 添加版本</ElButton>
      </div>
    </template>
  </div>
</template>
