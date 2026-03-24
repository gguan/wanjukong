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
});

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
    await api.post('/api/admin/products', {
      ...form.value,
      price: Number(form.value.price),
      stock: Number(form.value.stock),
      imageUrl: form.value.imageUrl || undefined,
      description: form.value.description || undefined,
    });
    router.push('/products');
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
          Status
          <select v-model="form.status">
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SOLD_OUT">Sold Out</option>
          </select>
        </label>

        <label>
          Availability
          <select v-model="form.availability">
            <option value="IN_STOCK">In Stock</option>
            <option value="PREORDER">Preorder</option>
          </select>
        </label>

        <div class="full-width">
          <span class="field-label">Cover Image</span>
          <ProductImageUploader v-model="form.imageUrl" />
        </div>

        <label class="full-width">
          Description
          <textarea v-model="form.description" rows="3" />
        </label>
      </div>

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
</style>
