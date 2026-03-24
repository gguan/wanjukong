<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;
const { fetchProductBySlug } = useProducts();

const { data: product, error, status } = useAsyncData(
  `product-${slug}`,
  () => fetchProductBySlug(slug),
);

function formatPrice(price: number | string) {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return `$${num.toFixed(2)}`;
}

function availabilityLabel(a: string) {
  return a === 'PREORDER' ? 'Pre-order' : 'In Stock';
}
</script>

<template>
  <div class="page-container">
    <NuxtLink to="/products" class="back-link">&larr; Back to products</NuxtLink>

    <div v-if="status === 'pending'" class="loading-state">Loading product...</div>

    <div v-else-if="error || !product" class="error-state">
      <h2>Product not found</h2>
      <p>The product you are looking for does not exist or is no longer available.</p>
      <NuxtLink to="/products" class="back-link">Browse all products</NuxtLink>
    </div>

    <div v-else class="product-detail">
      <div class="product-image">
        <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" />
        <div v-else class="placeholder">No Image</div>
      </div>

      <div class="product-info">
        <NuxtLink :to="`/brands/${product.brand.slug}`" class="brand-link">
          {{ product.brand.name }}
        </NuxtLink>
        <h1 class="product-name">{{ product.name }}</h1>

        <div class="meta-row">
          <span class="meta-tag">{{ product.category.name }}</span>
          <span v-if="product.scale" class="meta-tag">{{ product.scale }}</span>
          <span class="meta-tag" :class="product.availability === 'PREORDER' ? 'preorder' : 'instock'">
            {{ availabilityLabel(product.availability) }}
          </span>
        </div>

        <p class="price">{{ formatPrice(product.price) }}</p>

        <div v-if="product.description" class="description">
          <h3>Description</h3>
          <p>{{ product.description }}</p>
        </div>
      </div>
    </div>
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

.product-detail {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: start;
}

@media (max-width: 768px) {
  .product-detail {
    grid-template-columns: 1fr;
  }
}

.product-image {
  aspect-ratio: 1;
  background: #f9fafb;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  font-size: 1rem;
}

.brand-link {
  display: inline-block;
  font-size: 0.8rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-decoration: none;
  margin-bottom: 8px;
}

.brand-link:hover {
  color: #111;
}

.product-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 12px;
  line-height: 1.3;
}

.meta-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.meta-tag {
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: 4px;
  background: #f3f4f6;
  color: #555;
}

.meta-tag.preorder {
  background: #fef3c7;
  color: #92400e;
}

.meta-tag.instock {
  background: #d1fae5;
  color: #065f46;
}

.price {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 24px;
}

.description h3 {
  font-size: 1rem;
  margin: 0 0 8px;
  color: #333;
}

.description p {
  color: #555;
  line-height: 1.6;
  margin: 0;
}
</style>
