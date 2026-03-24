<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { fetchProducts, fetchCategories } = useProducts();
const { fetchBrands } = useBrands();

// Read filters from query
const selectedBrand = computed(() => (route.query.brand as string) || '');
const selectedCategory = computed(() => (route.query.category as string) || '');
const selectedScale = computed(() => (route.query.scale as string) || '');
const selectedAvailability = computed(() => (route.query.availability as string) || '');

const filters = computed(() => ({
  brand: selectedBrand.value,
  category: selectedCategory.value,
  scale: selectedScale.value,
  availability: selectedAvailability.value,
}));

const { data: products, status } = useAsyncData(
  'products',
  () => fetchProducts(filters.value),
  { watch: [filters] },
);

const { data: brands } = useAsyncData('brands-filter', fetchBrands);
const { data: categories } = useAsyncData('categories-filter', fetchCategories);

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
  () =>
    selectedBrand.value ||
    selectedCategory.value ||
    selectedScale.value ||
    selectedAvailability.value,
);
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Products</h1>
    <p class="page-subtitle">Browse our collection of collectible figures and accessories.</p>

    <!-- Filters -->
    <div class="filters">
      <select
        :value="selectedBrand"
        @change="updateFilter('brand', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">All Brands</option>
        <option v-for="b in brands" :key="b.id" :value="b.slug">{{ b.name }}</option>
      </select>

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

    <!-- Results -->
    <div v-if="status === 'pending'" class="loading-state">Loading products...</div>

    <div v-else-if="!products?.length" class="empty-state">
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
  </div>
</template>

<style scoped>
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
