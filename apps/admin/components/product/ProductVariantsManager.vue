<script setup lang="ts">
const props = defineProps<{ productId: string }>();
const api = useAdminApi();

interface Variant {
  id: string;
  name: string;
  versionCode: string | null;
  sku: string;
  manufacturerSku: string | null;
  priceCents: number;
  stock: number;
  subtitle: string | null;
  specSummary: string | null;
  specifications: string | null;
  isDefault: boolean;
  sortOrder: number;
  coverImageUrl: string | null;
}

const variants = ref<Variant[]>([]);
const loading = ref(false);
const error = ref('');
const showForm = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  name: '',
  versionCode: '',
  sku: '',
  manufacturerSku: '',
  priceCents: 0,
  stock: 0,
  subtitle: '',
  specSummary: '',
  specifications: '',
  isDefault: false,
  sortOrder: 0,
  coverImageUrl: '',
});

function resetForm() {
  form.name = '';
  form.versionCode = '';
  form.sku = '';
  form.manufacturerSku = '';
  form.priceCents = 0;
  form.stock = 0;
  form.subtitle = '';
  form.specSummary = '';
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
  showForm.value = true;
}

function startEdit(v: Variant) {
  editingId.value = v.id;
  form.name = v.name;
  form.versionCode = v.versionCode || '';
  form.sku = v.sku;
  form.manufacturerSku = v.manufacturerSku || '';
  form.priceCents = v.priceCents;
  form.stock = v.stock;
  form.subtitle = v.subtitle || '';
  form.specSummary = v.specSummary || '';
  form.specifications = v.specifications || '';
  form.isDefault = v.isDefault;
  form.sortOrder = v.sortOrder;
  form.coverImageUrl = v.coverImageUrl || '';
  showForm.value = true;
}

async function saveVariant() {
  error.value = '';
  const payload = {
    ...form,
    priceCents: Number(form.priceCents),
    stock: Number(form.stock),
    sortOrder: Number(form.sortOrder),
    sku: form.sku || undefined, // blank = auto-generate on create
    manufacturerSku: form.manufacturerSku || undefined,
    versionCode: form.versionCode || undefined,
    subtitle: form.subtitle || undefined,
    specSummary: form.specSummary || undefined,
    specifications: form.specifications || undefined,
    coverImageUrl: form.coverImageUrl || undefined,
  };

  try {
    if (editingId.value) {
      await api.patch(
        `/api/admin/products/${props.productId}/variants/${editingId.value}`,
        payload,
      );
    } else {
      await api.post(
        `/api/admin/products/${props.productId}/variants`,
        payload,
      );
    }
    showForm.value = false;
    resetForm();
    await loadVariants();
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to save variant';
  }
}

async function deleteVariant(id: string) {
  if (!confirm('Delete this variant?')) return;
  try {
    await api.del(`/api/admin/products/${props.productId}/variants/${id}`);
    await loadVariants();
  } catch {
    error.value = 'Failed to delete variant';
  }
}

async function setDefault(id: string) {
  try {
    await api.patch(
      `/api/admin/products/${props.productId}/variants/${id}`,
      { isDefault: true },
    );
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
  <div class="variants-manager">
    <div class="manager-header">
      <h3>Variants</h3>
      <button class="btn btn--sm" @click="startCreate">+ Add Variant</button>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <!-- Variant form -->
    <div v-if="showForm" class="variant-form-panel">
      <h4>{{ editingId ? 'Edit Variant' : 'New Variant' }}</h4>
      <div class="vform-grid">
        <label>
          Name *
          <input v-model="form.name" required />
        </label>
        <label>
          SKU
          <input v-model="form.sku" :placeholder="editingId ? '' : 'Auto-generated if blank'" />
          <small v-if="!editingId" class="field-hint">Leave blank to auto-generate</small>
        </label>
        <label>
          Manufacturer SKU
          <input v-model="form.manufacturerSku" placeholder="e.g. MMS617" />
        </label>
        <label>
          Price (cents) *
          <input v-model.number="form.priceCents" type="number" min="0" required />
        </label>
        <label>
          Stock
          <input v-model.number="form.stock" type="number" min="0" />
        </label>
        <label>
          Sort Order
          <input v-model.number="form.sortOrder" type="number" min="0" />
        </label>
        <label class="full-width">
          Subtitle
          <input v-model="form.subtitle" placeholder="Includes extra accessories..." />
        </label>
        <label class="full-width">
          Specifications
          <textarea v-model="form.specifications" rows="4" placeholder="Detailed specifications for this variant..." />
        </label>
        <label class="full-width">
          Cover Image URL
          <input v-model="form.coverImageUrl" placeholder="Optional variant-specific image" />
        </label>
        <div class="full-width">
          <label class="checkbox-label">
            <input v-model="form.isDefault" type="checkbox" />
            Default variant
          </label>
        </div>
      </div>
      <div class="vform-actions">
        <button class="btn" @click="saveVariant">
          {{ editingId ? 'Update' : 'Create' }}
        </button>
        <button class="btn btn--secondary" @click="showForm = false; resetForm()">
          Cancel
        </button>
      </div>
    </div>

    <!-- Variant list -->
    <div v-if="loading" class="loading-msg">Loading variants...</div>
    <div v-else-if="variants.length === 0 && !showForm" class="empty-msg">
      No variants yet. Add one above.
    </div>
    <div v-else class="variant-list">
      <div
        v-for="v in variants"
        :key="v.id"
        class="variant-item"
        :class="{ default: v.isDefault }"
      >
        <div class="variant-info">
          <div class="variant-name">
            {{ v.name }}
            <span v-if="v.isDefault" class="default-badge">Default</span>
          </div>
          <div class="variant-meta">
            SKU: {{ v.sku }}<span v-if="v.manufacturerSku"> · Mfr: {{ v.manufacturerSku }}</span> · {{ formatPrice(v.priceCents) }} · Stock: {{ v.stock }}
          </div>
          <div v-if="v.subtitle" class="variant-subtitle">{{ v.subtitle }}</div>
        </div>
        <div class="variant-actions">
          <button v-if="!v.isDefault" class="action-btn" @click="setDefault(v.id)">★ Default</button>
          <button class="action-btn" @click="startEdit(v)">Edit</button>
          <button v-if="!v.isDefault" class="action-btn danger" @click="deleteVariant(v.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.variants-manager {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.manager-header h3 { margin: 0; font-size: 0.95rem; }

.btn { display: inline-block; padding: 6px 14px; background: #1a1a2e; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn:hover { background: #2d2d4e; }
.btn--sm { padding: 5px 12px; font-size: 0.75rem; }
.btn--secondary { background: #888; }
.btn--secondary:hover { background: #666; }

.error-msg { background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; padding: 8px 12px; border-radius: 4px; font-size: 0.8rem; margin-bottom: 12px; }
.loading-msg, .empty-msg { color: #999; font-size: 0.85rem; text-align: center; padding: 16px 0; }

.variant-form-panel { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.variant-form-panel h4 { margin: 0 0 12px; font-size: 0.9rem; }

.vform-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.vform-grid .full-width { grid-column: 1 / -1; }
.vform-grid label { display: block; font-size: 0.8rem; color: #555; }
.vform-grid input, .vform-grid select, .vform-grid textarea { display: block; width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; margin-top: 3px; box-sizing: border-box; font-family: inherit; }
.field-hint { display: block; font-size: 0.65rem; color: #999; margin-top: 2px; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #555; }
.checkbox-label input[type="checkbox"] { width: auto; margin: 0; }
.vform-actions { display: flex; gap: 8px; margin-top: 12px; }

.variant-list { display: flex; flex-direction: column; gap: 6px; }

.variant-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; }
.variant-item.default { border-color: #3b82f6; background: #eff6ff; }

.variant-name { font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
.variant-meta { font-size: 0.75rem; color: #666; margin-top: 2px; }
.variant-subtitle { font-size: 0.75rem; color: #888; margin-top: 2px; font-style: italic; }

.default-badge { font-size: 0.65rem; background: #3b82f6; color: #fff; padding: 1px 5px; border-radius: 3px; font-weight: 500; }
.status-badge { font-size: 0.65rem; padding: 1px 5px; border-radius: 3px; font-weight: 500; }
.status-badge.active { background: #d1fae5; color: #065f46; }
.status-badge.draft { background: #f3f4f6; color: #555; }
.status-badge.inactive { background: #fef3c7; color: #92400e; }
.status-badge.sold_out { background: #fee2e2; color: #991b1b; }

.variant-actions { display: flex; gap: 4px; flex-shrink: 0; }
.action-btn { padding: 3px 8px; font-size: 0.7rem; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 3px; cursor: pointer; }
.action-btn:hover { background: #e5e7eb; }
.action-btn.danger { color: #b91c1c; border-color: #fca5a5; }
.action-btn.danger:hover { background: #fef2f2; }
</style>
