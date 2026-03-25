<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();
const route = useRoute();
const router = useRouter();

interface Option { id: string; name: string }

const brands = ref<Option[]>([]);
const categories = ref<Option[]>([]);
const saving = ref(false);
const loadingData = ref(true);
const error = ref<string | null>(null);

const form = ref({
  name: '',
  slug: '',
  description: '',
  price: 0,
  stock: 0,
  scale: '',
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

onMounted(async () => {
  const [product, brandList, categoryList] = await Promise.all([
    api.get<Record<string, unknown>>(`/api/admin/products/${route.params.id}`),
    api.get<Option[]>('/api/admin/brands'),
    api.get<Option[]>('/api/admin/categories'),
  ]);

  brands.value = brandList;
  categories.value = categoryList;

  form.value = {
    name: product.name as string,
    slug: product.slug as string,
    description: (product.description as string) || '',
    price: Number(product.price),
    stock: Number(product.stock ?? 0),
    scale: (product.scale as string) || '',
    status: product.status as string,
    availability: product.availability as string,
    imageUrl: (product.imageUrl as string) || '',
    brandId: product.brandId as string,
    categoryId: product.categoryId as string,
    saleType: (product.saleType as string) || 'IN_STOCK',
    preorderStartAt: product.preorderStartAt ? toLocalDatetime(product.preorderStartAt as string) : '',
    preorderEndAt: product.preorderEndAt ? toLocalDatetime(product.preorderEndAt as string) : '',
    estimatedShipAt: product.estimatedShipAt ? toLocalDatetime(product.estimatedShipAt as string) : '',
  };

  loadingData.value = false;
});

function toLocalDatetime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const isPreorder = computed(() => form.value.saleType === 'PREORDER');

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
      payload.preorderStartAt = form.value.preorderStartAt ? new Date(form.value.preorderStartAt).toISOString() : null;
      payload.preorderEndAt = form.value.preorderEndAt ? new Date(form.value.preorderEndAt).toISOString() : null;
    } else {
      payload.preorderStartAt = null;
      payload.preorderEndAt = null;
    }
    payload.estimatedShipAt = form.value.estimatedShipAt ? new Date(form.value.estimatedShipAt).toISOString() : null;

    await api.put(`/api/admin/products/${route.params.id}`, payload);
    router.push('/products');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to update product';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <h2>Edit Product</h2>

    <p v-if="loadingData" class="loading">Loading...</p>

    <template v-else>
      <div v-if="error" class="error-msg">{{ error }}</div>

      <form class="product-form" @submit.prevent="save">
        <div class="form-grid">
          <label>
            Name *
            <input v-model="form.name" required />
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

        <div class="form-actions">
          <button type="submit" class="btn" :disabled="saving">
            {{ saving ? 'Saving...' : 'Update Product' }}
          </button>
          <NuxtLink to="/products" class="btn btn--secondary">Cancel</NuxtLink>
        </div>
      </form>

      <div class="images-section">
        <ProductImagesManager :product-id="(route.params.id as string)" />
      </div>

      <div class="variants-section">
        <ProductVariantsManager :product-id="(route.params.id as string)" />
      </div>
    </template>
  </div>
</template>

<style scoped>
h2 { margin: 0 0 20px; }
.loading { color: #999; }
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
.form-actions { display: flex; gap: 8px; margin-top: 24px; }
.btn { display: inline-block; padding: 8px 20px; background: #1a1a2e; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; text-decoration: none; }
.btn:hover { background: #2d2d4e; }
.btn:disabled { opacity: 0.6; }
.btn--secondary { background: #888; }
.btn--secondary:hover { background: #666; }
.images-section { margin-top: 32px; max-width: 700px; }
.variants-section { margin-top: 24px; max-width: 700px; }
</style>
