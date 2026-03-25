<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();
const router = useRouter();

interface Option { id: string; name: string }

const brands = ref<Option[]>([]);
const categories = ref<Option[]>([]);
const saving = ref(false);
const error = ref<string | null>(null);

const form = ref({
  name: '',
  slug: '',
  description: '',
  price: 0,
  stock: 0,
  scale: '1/6',
  status: 'DRAFT',
  availability: 'IN_STOCK',
  imageUrl: '',
  brandId: '',
  categoryId: '',
  saleType: 'IN_STOCK',
  preorderStartAt: '',
  preorderEndAt: '',
  estimatedShipAt: '',
});

const isPreorder = computed(() => form.value.saleType === 'PREORDER');

onMounted(async () => {
  brands.value = await api.get('/api/admin/brands');
  categories.value = await api.get('/api/admin/categories');
});

function generateSlug() {
  form.value.slug = form.value.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function save() {
  saving.value = true;
  error.value = null;
  try {
    const payload: Record<string, unknown> = {
      ...form.value,
      price: Number(form.value.price),
      stock: Number(form.value.stock),
      imageUrl: form.value.imageUrl || undefined,
      description: form.value.description || undefined,
    };

    // Handle preorder dates
    if (form.value.saleType === 'PREORDER') {
      payload.preorderStartAt = form.value.preorderStartAt ? new Date(form.value.preorderStartAt).toISOString() : undefined;
      payload.preorderEndAt = form.value.preorderEndAt ? new Date(form.value.preorderEndAt).toISOString() : undefined;
    }
    payload.estimatedShipAt = form.value.estimatedShipAt ? new Date(form.value.estimatedShipAt).toISOString() : undefined;

    // 1. Create product
    const product = await api.post<{ id: string }>('/api/admin/products', payload);

    // 2. Auto-create standard variant
    await api.post(`/api/admin/products/${product.id}/variants`, {
      name: 'Standard',
      sku: form.value.slug + '-std',
      priceCents: Math.round(Number(form.value.price) * 100),
      stock: Number(form.value.stock),
      status: form.value.status,
      availabilityType: form.value.availability,
      isDefault: true,
      sortOrder: 0,
    });

    router.push(`/products/${product.id}`);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to create product';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <h2>New Product</h2>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <form class="product-form" @submit.prevent="save">
      <div class="form-grid">
        <label>
          Name *
          <input v-model="form.name" required @blur="!form.slug && generateSlug()" />
        </label>

        <label>
          Slug *
          <input v-model="form.slug" required />
        </label>

        <label>
          Brand *
          <select v-model="form.brandId" required>
            <option value="" disabled>Select brand</option>
            <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </label>

        <label>
          Category *
          <select v-model="form.categoryId" required>
            <option value="" disabled>Select category</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>

        <label>
          Price *
          <input v-model="form.price" type="number" step="0.01" min="0" required />
        </label>

        <label>
          Scale
          <input v-model="form.scale" placeholder="1/6" />
        </label>

        <label>
          Stock
          <input v-model="form.stock" type="number" min="0" />
        </label>

        <label>
          Product Status
          <select v-model="form.status">
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <small class="field-help">Controls storefront visibility</small>
        </label>

        <label>
          Availability
          <select v-model="form.availability">
            <option value="IN_STOCK">In Stock</option>
            <option value="PREORDER">Preorder</option>
            <option value="SOLD_OUT">Sold Out</option>
            <option value="COMING_SOON">Coming Soon</option>
          </select>
          <small class="field-help">Controls whether customers can purchase</small>
        </label>

        <label>
          Sale Type *
          <select v-model="form.saleType">
            <option value="IN_STOCK">In Stock</option>
            <option value="PREORDER">Preorder</option>
          </select>
        </label>

        <template v-if="isPreorder">
          <label>
            Preorder Start
            <input v-model="form.preorderStartAt" type="datetime-local" />
          </label>

          <label>
            Preorder End
            <input v-model="form.preorderEndAt" type="datetime-local" />
          </label>
        </template>

        <label>
          Estimated Ship Date
          <input v-model="form.estimatedShipAt" type="datetime-local" />
        </label>

        <div class="full-width">
          <span class="field-label">Cover Image</span>
          <ProductImageUploader v-model="form.imageUrl" />
        </div>

        <label class="full-width">
          Description
          <textarea v-model="form.description" rows="4" />
        </label>
      </div>

      <p class="create-note">
        A default "Standard" variant will be created automatically with the price and stock entered above.
        You can add more variants after saving.
      </p>

      <div class="form-actions">
        <button type="submit" class="btn" :disabled="saving">
          {{ saving ? 'Saving...' : 'Create Product' }}
        </button>
        <NuxtLink to="/products" class="btn btn--secondary">Cancel</NuxtLink>
      </div>
    </form>
  </div>
</template>

<style scoped>
h2 { margin: 0 0 20px; }
.error-msg { background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; padding: 10px; border-radius: 4px; margin-bottom: 16px; }
.product-form { max-width: 700px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.full-width { grid-column: 1 / -1; }
label, .field-label { display: block; font-size: 0.875rem; color: #555; }
.field-label { margin-bottom: 6px; }
.field-help { display: block; font-size: 0.7rem; color: #999; margin-top: 2px; }
input, select, textarea {
  display: block; width: 100%; margin-top: 4px; padding: 8px 10px;
  border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem;
  box-sizing: border-box; font-family: inherit;
}
.create-note { font-size: 0.8rem; color: #888; margin-top: 16px; font-style: italic; }
.form-actions { display: flex; gap: 8px; margin-top: 16px; }
.btn { display: inline-block; padding: 8px 20px; background: #1a1a2e; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; text-decoration: none; }
.btn:hover { background: #2d2d4e; }
.btn:disabled { opacity: 0.6; }
.btn--secondary { background: #888; }
.btn--secondary:hover { background: #666; }
</style>
