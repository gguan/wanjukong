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
const drawerVisible = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  name: '',
  sku: '',
  manufacturerSku: '',
  priceCents: 0,
  stock: 0,
  subtitle: '',
  specifications: '',
  isDefault: false,
  sortOrder: 0,
  coverImageUrl: '',
});

function resetForm() {
  form.name = '';
  form.sku = '';
  form.manufacturerSku = '';
  form.priceCents = 0;
  form.stock = 0;
  form.subtitle = '';
  form.specifications = '';
  form.isDefault = false;
  form.sortOrder = 0;
  form.coverImageUrl = '';
  editingId.value = null;
}

async function loadVariants() {
  loading.value = true;
  try {
    variants.value = await api.get<Variant[]>(
      `/api/admin/products/${props.productId}/variants`,
    );
  } catch {
    error.value = 'Failed to load variants';
  } finally {
    loading.value = false;
  }
}

function startCreate() {
  resetForm();
  form.sortOrder = variants.value.length;
  drawerVisible.value = true;
}

function startEdit(v: Variant) {
  editingId.value = v.id;
  form.name = v.name;
  form.sku = v.sku;
  form.manufacturerSku = v.manufacturerSku || '';
  form.priceCents = v.priceCents;
  form.stock = v.stock;
  form.subtitle = v.subtitle || '';
  form.specifications = v.specifications || '';
  form.isDefault = v.isDefault;
  form.sortOrder = v.sortOrder;
  form.coverImageUrl = v.coverImageUrl || '';
  drawerVisible.value = true;
}

async function saveVariant() {
  error.value = '';
  const payload = {
    ...form,
    priceCents: Number(form.priceCents),
    stock: Number(form.stock),
    sortOrder: Number(form.sortOrder),
    sku: form.sku || undefined,
    manufacturerSku: form.manufacturerSku || undefined,
    subtitle: form.subtitle || undefined,
    specifications: form.specifications || undefined,
    coverImageUrl: form.coverImageUrl || undefined,
  };

  try {
    if (editingId.value) {
      await api.patch(
        `/api/admin/products/${props.productId}/variants/${editingId.value}`,
        payload,
      );
      ElMessage.success('Variant updated');
    } else {
      await api.post(
        `/api/admin/products/${props.productId}/variants`,
        payload,
      );
      ElMessage.success('Variant created');
    }
    drawerVisible.value = false;
    resetForm();
    await loadVariants();
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to save variant';
  }
}

async function deleteVariant(id: string) {
  try {
    await ElMessageBox.confirm('Delete this variant?', 'Confirm', { type: 'warning' });
    await api.del(`/api/admin/products/${props.productId}/variants/${id}`);
    ElMessage.success('Variant deleted');
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

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

onMounted(loadVariants);
</script>

<template>
  <div>
    <div style="display: flex; justify-content: flex-end; margin-bottom: 12px">
      <ElButton type="primary" size="small" @click="startCreate">+ Add Variant</ElButton>
    </div>

    <ElAlert v-if="error" :title="error" type="error" closable style="margin-bottom: 12px" @close="error = ''" />

    <!-- Variant drawer form -->
    <ElDrawer
      v-model="drawerVisible"
      :title="editingId ? 'Edit Variant' : 'New Variant'"
      size="480px"
      destroy-on-close
    >
      <ElForm label-position="top">
        <ElFormItem label="Name" required>
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElRow :gutter="16">
          <ElCol :span="12">
            <ElFormItem label="SKU">
              <ElInput v-model="form.sku" :placeholder="editingId ? '' : 'Auto-generated if blank'" />
              <div v-if="!editingId" style="font-size: 12px; color: #909399">Leave blank to auto-generate</div>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="Manufacturer SKU">
              <ElInput v-model="form.manufacturerSku" placeholder="e.g. MMS617" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElRow :gutter="16">
          <ElCol :span="12">
            <ElFormItem label="Price (cents)" required>
              <ElInputNumber v-model="form.priceCents" :min="0" style="width: 100%" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="Stock">
              <ElInputNumber v-model="form.stock" :min="0" style="width: 100%" />
            </ElFormItem>
          </ElCol>
        </ElRow>
        <ElFormItem label="Sort Order">
          <ElInputNumber v-model="form.sortOrder" :min="0" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="Subtitle">
          <ElInput v-model="form.subtitle" placeholder="Includes extra accessories..." />
        </ElFormItem>
        <ElFormItem label="Specifications">
          <ElInput v-model="form.specifications" type="textarea" :rows="4" placeholder="Detailed specifications..." />
        </ElFormItem>
        <ElFormItem label="Cover Image URL">
          <ElInput v-model="form.coverImageUrl" placeholder="Optional variant-specific image" />
        </ElFormItem>
        <ElFormItem>
          <ElSwitch v-model="form.isDefault" active-text="Default variant" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="drawerVisible = false">Cancel</ElButton>
        <ElButton type="primary" @click="saveVariant">
          {{ editingId ? 'Update' : 'Create' }}
        </ElButton>
      </template>
    </ElDrawer>

    <!-- Variant list -->
    <div v-if="loading" v-loading="true" style="height: 100px" />

    <ElEmpty v-else-if="variants.length === 0" description="No variants yet. Add one above." />

    <div v-else style="display: flex; flex-direction: column; gap: 8px">
      <div
        v-for="v in variants"
        :key="v.id"
        style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border: 1px solid var(--wk-admin-border); border-radius: 6px"
        :style="v.isDefault ? { borderColor: '#409EFF', background: '#ecf5ff' } : {}"
      >
        <div>
          <div style="font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 6px">
            {{ v.name }}
            <ElTag v-if="v.isDefault" type="primary" size="small">Default</ElTag>
          </div>
          <div style="font-size: 0.8rem; color: #909399; margin-top: 4px">
            SKU: {{ v.sku }}
            <span v-if="v.manufacturerSku"> · Mfr: {{ v.manufacturerSku }}</span>
            · {{ formatPrice(v.priceCents) }}
            · Stock: {{ v.stock }}
          </div>
          <div v-if="v.subtitle" style="font-size: 0.8rem; color: #b1b3b8; margin-top: 2px; font-style: italic">
            {{ v.subtitle }}
          </div>
        </div>
        <ElSpace>
          <ElButton v-if="!v.isDefault" size="small" @click="setDefault(v.id)">★ Default</ElButton>
          <ElButton size="small" @click="startEdit(v)">Edit</ElButton>
          <ElButton v-if="!v.isDefault" size="small" type="danger" @click="deleteVariant(v.id)">Delete</ElButton>
        </ElSpace>
      </div>
    </div>
  </div>
</template>
