<script setup lang="ts">
import type { Product } from '~/composables/useProducts';

defineProps<{
  product: Product;
}>();
</script>

<template>
  <NuxtLink :to="`/products/${product.slug}`" class="product-card">
    <div class="card-image">
      <img
        v-if="product.imageUrl"
        :src="product.imageUrl"
        :alt="product.name"
      />
      <div v-else class="placeholder">
        <span>No Image</span>
      </div>
      <span
        v-if="product.availability === 'PREORDER'"
        class="badge preorder"
      >
        Pre-order
      </span>
    </div>
    <div class="card-body">
      <p class="brand-name">{{ product.brand.name }}</p>
      <h3 class="product-name">{{ product.name }}</h3>
      <div class="meta">
        <span class="category">{{ product.category.name }}</span>
        <span v-if="product.scale" class="scale">{{ product.scale }}</span>
      </div>
      <ProductPrice :price="product.price" class="price" />
    </div>
  </NuxtLink>
</template>

<style scoped>
.product-card {
  display: block;
  text-decoration: none;
  color: inherit;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
}

.product-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.card-image {
  position: relative;
  aspect-ratio: 1;
  background: #f9fafb;
  overflow: hidden;
}

.card-image img {
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
  font-size: 0.85rem;
}

.badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.preorder {
  background: #fef3c7;
  color: #92400e;
}

.card-body {
  padding: 12px;
}

.brand-name {
  font-size: 0.75rem;
  color: #888;
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.product-name {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 6px;
  line-height: 1.3;
  color: #111;
}

.meta {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.category,
.scale {
  font-size: 0.75rem;
  color: #666;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
}

.price {
  font-size: 1rem;
}
</style>
