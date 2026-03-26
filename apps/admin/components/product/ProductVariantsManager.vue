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
    error.value = 'Failed to load variants';
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
    ElMessage.success('Variant updated');
    await loadVariants();
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to save variant';
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
    ElMessage.success('Variant created');
    showNewForm.value = false;
    resetNewForm();
    await loadVariants();
    // Auto-expand new variant
    if (created?.id) {
      expandedIds.value.add(created.id);
    }
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to create variant';
  } finally {
    creatingNew.value = false;
  }
}

async function deleteVariant(id: string) {
  try {
    await ElMessageBox.confirm('Delete this variant?', 'Confirm', { type: 'warning' });
    await api.del(`/api/admin/products/${props.productId}/variants/${id}`);
    ElMessage.success('Variant deleted');
    expandedIds.value.delete(id);
    await loadVariants();
  } catch (e: any) {
    if (e !== 'cancel') {
      error.value = e?.data?.message || 'Failed to delete variant';
    }
  }
}

async function setDefault(id: string) {
  try {
    await api.patch(
      `/api/admin/products/${props.productId}/variants/${id}`,
      { isDefault: true },
    );
    ElMessage.success('Default variant updated');
    await loadVariants();
  } catch {
    error.value = 'Failed to set default';
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

      <ElEmpty v-else-if="!showNewForm" description="No variants yet." />

      <!-- New variant inline form -->
      <div v-if="showNewForm" class="variant-card" style="margin-top: 12px">
        <div class="variant-card__header" style="cursor: default">
          <div class="variant-card__header-left">
            <span class="variant-card__name">New Version</span>
          </div>
          <div class="variant-card__actions">
            <ElButton size="small" text @click="showNewForm = false">Cancel</ElButton>
          </div>
        </div>
        <div class="variant-card__body">
          <ElForm label-position="top">
            <div class="form-grid form-grid--2">
              <ElFormItem label="Version Name" required>
                <ElInput v-model="newForm.name" placeholder="e.g. Deluxe, Exclusive" />
              </ElFormItem>
              <ElFormItem label="Sort Order">
                <ElInputNumber v-model="newForm.sortOrder" :min="0" style="width: 100%" />
              </ElFormItem>
            </div>
            <div class="form-grid form-grid--2">
              <ElFormItem label="SKU">
                <ElInput v-model="newForm.sku" placeholder="Auto-generated if blank" />
                <div class="field-hint">Leave blank to auto-generate</div>
              </ElFormItem>
              <ElFormItem label="Manufacturer SKU">
                <ElInput v-model="newForm.manufacturerSku" placeholder="e.g. MMS617" />
              </ElFormItem>
            </div>
            <div class="form-grid form-grid--2">
              <ElFormItem label="Price (cents)" required>
                <ElInputNumber v-model="newForm.priceCents" :min="0" style="width: 100%" />
              </ElFormItem>
              <ElFormItem label="Stock">
                <ElInputNumber v-model="newForm.stock" :min="0" style="width: 100%" />
              </ElFormItem>
            </div>
            <ElFormItem label="Subtitle">
              <ElInput v-model="newForm.subtitle" placeholder="e.g. Includes extra accessories..." />
            </ElFormItem>
            <ElFormItem label="Cover Image URL">
              <ElInput v-model="newForm.coverImageUrl" placeholder="Optional variant-specific image" />
            </ElFormItem>
            <ElFormItem label="Specifications">
              <ProductRichTextEditor v-model="newForm.specifications" />
            </ElFormItem>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px">
              <ElButton @click="showNewForm = false">Cancel</ElButton>
              <ElButton type="primary" :loading="creatingNew" @click="createVariant">Create Version</ElButton>
            </div>
          </ElForm>
        </div>
      </div>

      <!-- Add version button -->
      <div v-if="!showNewForm" style="margin-top: 12px">
        <ElButton @click="startCreate">+ Add Version</ElButton>
      </div>
    </template>
  </div>
</template>
