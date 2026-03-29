<script setup lang="ts">
useSeoMeta({
  title: 'Products — Wanjukong',
  description: 'Browse our collection of premium collectible action figures. Filter by brand, category, scale and availability.',
})

const route = useRoute();
const router = useRouter();
const { fetchProducts, fetchCategories } = useProducts();
const { fetchBrands } = useBrands();

// Read filters from query
const selectedBrand = computed(() => (route.query.brand as string) || '');
const selectedCategory = computed(() => (route.query.category as string) || '');
const selectedScale = computed(() => (route.query.scale as string) || '');
const selectedAvailability = computed(() => (route.query.availability as string) || '');
const searchQuery = computed(() => (route.query.search as string) || '');
const currentPage = computed(() => parseInt(route.query.page as string) || 1);

const filters = computed(() => ({
  brand: selectedBrand.value,
  category: selectedCategory.value,
  scale: selectedScale.value,
  availability: selectedAvailability.value,
  search: searchQuery.value,
  page: String(currentPage.value),
  limit: '20',
}));

const { data: result, status } = useAsyncData(
  'products',
  () => fetchProducts(filters.value),
  { watch: [filters] },
);

const products = computed(() => result.value?.data || []);
const totalPages = computed(() => {
  if (!result.value) return 1;
  return Math.ceil(result.value.total / result.value.limit) || 1;
});

const { data: brands } = useAsyncData('brands-filter', fetchBrands);
const { data: categories } = useAsyncData('categories-filter', fetchCategories);

// Search input
const searchInput = ref(searchQuery.value);
watch(searchQuery, (v) => { searchInput.value = v; });

function submitSearch() {
  updateFilter('search', searchInput.value.trim());
}

function updateFilter(key: string, value: string) {
  const query = { ...route.query };
  if (value) {
    query[key] = value;
  } else {
    delete query[key];
  }
  // Reset page when filters change
  if (key !== 'page') {
    delete query.page;
  }
  router.push({ query });
}

function clearFilters() {
  searchInput.value = '';
  router.push({ query: {} });
}

function goToPage(page: number) {
  updateFilter('page', page > 1 ? String(page) : '');
}

const hasFilters = computed(
  () =>
    selectedBrand.value ||
    selectedCategory.value ||
    selectedScale.value ||
    selectedAvailability.value ||
    searchQuery.value,
);
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Products</h1>
    <p class="page-subtitle">Browse our collection of collectible figures and accessories.</p>

    <!-- Search + Filters -->
    <div class="filters">
      <form class="search-form" @submit.prevent="submitSearch">
        <input
          v-model="searchInput"
          type="text"
          class="search-input"
          placeholder="Search products..."
        />
        <button type="submit" class="search-btn" aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>

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

    <template v-else>
      <div class="product-grid">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
        />
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="page-btn"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          &lsaquo; Prev
        </button>
        <template v-for="p in totalPages" :key="p">
          <button
            v-if="p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)"
            class="page-btn"
            :class="{ active: p === currentPage }"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <span
            v-else-if="p === currentPage - 3 || p === currentPage + 3"
            class="page-ellipsis"
          >...</span>
        </template>
        <button
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          Next &rsaquo;
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  align-items: center;
}

.search-form {
  display: flex;
  position: relative;
}

.search-input {
  padding: 8px 36px 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.85rem;
  min-width: 200px;
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: #111;
}

.search-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #888;
  display: flex;
  align-items: center;
}

.search-btn:hover {
  color: #333;
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

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin-top: 32px;
  padding-bottom: 16px;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  color: #333;
  transition: background 0.15s, border-color 0.15s;
}

.page-btn:hover:not(:disabled):not(.active) {
  background: #f3f4f6;
  border-color: #999;
}

.page-btn.active {
  background: #111;
  color: #fff;
  border-color: #111;
}

.page-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.page-ellipsis {
  padding: 0 4px;
  color: #999;
  font-size: 0.85rem;
}
</style>
