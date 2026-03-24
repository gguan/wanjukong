<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;
const { fetchBrandBySlug } = useBrands();

const { data: brand, error, status } = useAsyncData(
  `brand-${slug}`,
  () => fetchBrandBySlug(slug),
);
</script>

<template>
  <div class="page-container">
    <NuxtLink to="/brands" class="back-link">&larr; Back to brands</NuxtLink>

    <div v-if="status === 'pending'" class="loading-state">Loading brand...</div>

    <div v-else-if="error || !brand" class="error-state">
      <h2>Brand not found</h2>
      <p>The brand you are looking for does not exist.</p>
      <NuxtLink to="/brands" class="back-link">Browse all brands</NuxtLink>
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
            {{ brand.products.length }} product{{ brand.products.length !== 1 ? 's' : '' }} available
          </p>
        </div>
      </div>

      <div v-if="!brand.products.length" class="empty-state">
        <p>No products available for this brand yet.</p>
      </div>

      <div v-else class="product-grid">
        <ProductCard
          v-for="product in brand.products"
          :key="product.id"
          :product="product"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 24px;
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link:hover {
  color: #111;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
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
</style>
