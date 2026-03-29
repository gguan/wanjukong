<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const slug = route.params.slug as string;
const { fetchBrandBySlug } = useBrands();
const { fetchProducts, fetchCategories } = useProducts();

// Brand info
const { data: brand, error: brandError, status: brandStatus } = useAsyncData(
  `brand-${slug}`,
  () => fetchBrandBySlug(slug),
);

// Filters
const selectedCategory = computed(() => (route.query.category as string) || '');
const selectedScale = computed(() => (route.query.scale as string) || '');
const selectedAvailability = computed(() => (route.query.availability as string) || '');

const filters = computed(() => ({
  brand: slug,
  category: selectedCategory.value,
  scale: selectedScale.value,
  availability: selectedAvailability.value,
}));

const { data: result, status: productsStatus } = useAsyncData(
  `brand-products-${slug}`,
  () => fetchProducts(filters.value),
  { watch: [filters] },
);

const products = computed(() => result.value?.data || []);

const { data: categories } = useAsyncData('brand-categories-filter', fetchCategories);

function updateFilter(key: string, value: string) {
  const query = { ...route.query };
  if (value) {
    query[key] = value;
  } else {
    delete query[key];
  }
  router.push({ query });
}

function clearFilters() {
  router.push({ query: {} });
}

const hasFilters = computed(
  () => selectedCategory.value || selectedScale.value || selectedAvailability.value,
);

const isLoading = computed(() => brandStatus.value === 'pending' || productsStatus.value === 'pending');

// ─── SEO ──────────────────────────────────────────────────
watchEffect(() => {
  if (!brand.value) return;
  useSeoMeta({
    title: `${brand.value.name} — Wanjukong`,
    description: `Browse all ${brand.value.name} collectible figures available at Wanjukong.`,
  })
})
</script>

<template>
  <div class="page-container">
    <UiBreadcrumb :items="[
      { label: 'Home', to: '/' },
      { label: 'Brands', to: '/brands' },
      { label: brand?.name || 'Brand' },
    ]" class="brand-breadcrumb" />

    <div v-if="isLoading" class="loading-state">Loading brand...</div>

    <div v-else-if="brandError || !brand" class="error-state">
      <h2>Brand not found</h2>
      <p>The brand you are looking for does not exist.</p>
      <NuxtLink to="/brands" class="error-link">Browse all brands</NuxtLink>
    </div>

    <template v-else>
      <div class="brand-header">
        <div class="brand-logo">
          <img v-if="brand.logo" :src="brand.logo" :alt="brand.name" />
          <span v-else class="brand-initial">{{ brand.name.charAt(0) }}</span>
        </div>
        <div>
          <h1 class="page-title">{{ brand.name }}</h1>
          <p class="page-subtitle">
            {{ result?.total || 0 }} product{{ (result?.total || 0) !== 1 ? 's' : '' }} available
          </p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select
          :value="selectedCategory"
          @change="updateFilter('category', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">All Categories</option>
          <option v-for="c in categories" :key="c.id" :value="c.slug">{{ c.name }}</option>
        </select>

        <select
          :value="selectedScale"
          @change="updateFilter('scale', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">All Scales</option>
          <option value="1/6">1/6</option>
          <option value="1/4">1/4</option>
          <option value="1/12">1/12</option>
        </select>

        <select
          :value="selectedAvailability"
          @change="updateFilter('availability', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">All Availability</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="PREORDER">Pre-order</option>
        </select>

        <button v-if="hasFilters" class="clear-btn" @click="clearFilters">Clear</button>
      </div>

      <div v-if="!products.length" class="empty-state">
        <p>No products found.</p>
        <button v-if="hasFilters" class="clear-btn" @click="clearFilters">Clear filters</button>
      </div>

      <div v-else class="product-grid">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.brand-breadcrumb {
  margin-bottom: 24px;
}

.error-link {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.brand-logo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-initial {
  font-size: 1.5rem;
  font-weight: 700;
  color: #666;
}

.brand-header .page-title {
  margin-bottom: 4px;
}

.brand-header .page-subtitle {
  margin-bottom: 0;
}

.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.filters select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.85rem;
  background: #fff;
  color: #333;
  cursor: pointer;
  min-width: 140px;
}

.clear-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  font-size: 0.85rem;
  cursor: pointer;
  color: #666;
}

.clear-btn:hover {
  background: #f3f4f6;
  color: #333;
}
</style>
