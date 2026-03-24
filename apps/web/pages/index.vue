<script setup lang="ts">
import { APP_NAME } from '@wanjukong/shared';

const { fetchBrands } = useBrands();
const { fetchProducts } = useProducts();

const { data: brands } = useAsyncData('home-brands', fetchBrands);
const { data: products } = useAsyncData('home-products', () => fetchProducts());

const featuredProducts = computed(() => (products.value ?? []).slice(0, 4));
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <h1>{{ APP_NAME }}</h1>
        <p>
          Your destination for premium collectible action figures.<br />
          Hot Toys, DAM, Threezero, and more.
        </p>
        <div class="hero-actions">
          <NuxtLink to="/products" class="btn btn-primary">Browse Products</NuxtLink>
          <NuxtLink to="/brands" class="btn btn-secondary">View Brands</NuxtLink>
        </div>
      </div>
    </section>

    <div class="page-container">
      <!-- Featured Brands -->
      <section v-if="brands?.length" class="section">
        <div class="section-header">
          <h2>Brands</h2>
          <NuxtLink to="/brands" class="view-all">View all &rarr;</NuxtLink>
        </div>
        <div class="brand-grid">
          <BrandCard v-for="brand in brands" :key="brand.id" :brand="brand" />
        </div>
      </section>

      <!-- Featured Products -->
      <section v-if="featuredProducts.length" class="section">
        <div class="section-header">
          <h2>Featured Products</h2>
          <NuxtLink to="/products" class="view-all">View all &rarr;</NuxtLink>
        </div>
        <div class="product-grid">
          <ProductCard
            v-for="product in featuredProducts"
            :key="product.id"
            :product="product"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.hero {
  background: #111;
  color: #fff;
  text-align: center;
  padding: 64px 20px;
}

.hero-inner {
  max-width: 600px;
  margin: 0 auto;
}

.hero h1 {
  font-size: 2.5rem;
  margin: 0 0 12px;
  letter-spacing: -0.03em;
}

.hero p {
  color: #aaa;
  font-size: 1.05rem;
  line-height: 1.6;
  margin: 0 0 28px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s;
}

.btn:hover {
  opacity: 0.85;
}

.btn-primary {
  background: #fff;
  color: #111;
}

.btn-secondary {
  background: transparent;
  color: #fff;
  border: 1px solid #555;
}

.section {
  margin-bottom: 48px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 1.35rem;
  margin: 0;
}

.view-all {
  font-size: 0.85rem;
  color: #666;
  text-decoration: none;
}

.view-all:hover {
  color: #111;
}
</style>
