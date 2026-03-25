<script setup lang="ts">
import type { ProductVariant } from '~/composables/useProducts';

const route = useRoute();
const slug = route.params.slug as string;
const { fetchProductBySlug } = useProducts();

const { data: product, error, status } = useAsyncData(
  `product-${slug}`,
  () => fetchProductBySlug(slug),
);

const selectedVariantId = ref<string | null>(null);
const selectedImageUrl = ref<string | null>(null);

// Select default variant once product loads
watch(product, (p) => {
  if (!p?.variants?.length) return;
  const def = p.variants.find((v) => v.isDefault) || p.variants[0];
  if (def && !selectedVariantId.value) {
    selectedVariantId.value = def.id;
  }
});

const selectedVariant = computed<ProductVariant | null>(() => {
  if (!product.value?.variants?.length) return null;
  return (
    product.value.variants.find((v) => v.id === selectedVariantId.value) ||
    product.value.variants[0]
  );
});

const hasVariants = computed(() => (product.value?.variants?.length ?? 0) > 0);

const displayImage = computed(() => {
  if (selectedImageUrl.value) return selectedImageUrl.value;
  // Variant-specific cover image
  if (selectedVariant.value?.coverImageUrl) return selectedVariant.value.coverImageUrl;
  // Product primary image from images list
  if (product.value?.images?.length) {
    const primary = product.value.images.find((i) => i.isPrimary);
    return primary?.imageUrl || product.value.images[0].imageUrl;
  }
  return product.value?.imageUrl || null;
});

const hasMultipleImages = computed(() => (product.value?.images?.length ?? 0) > 1);

const displayPrice = computed(() => {
  if (selectedVariant.value?.priceCents !== undefined) {
    return `$${(selectedVariant.value.priceCents / 100).toFixed(2)}`;
  }
  return '$0.00';
});

const displayAvailability = computed(() => {
  return product.value?.displayAvailability;
});

function selectImage(url: string) {
  selectedImageUrl.value = url;
}

function selectVariant(v: ProductVariant) {
  selectedVariantId.value = v.id;
  // If variant has its own cover, switch main image
  if (v.coverImageUrl) {
    selectedImageUrl.value = v.coverImageUrl;
  } else {
    selectedImageUrl.value = null;
  }
}

function availabilityLabel(a: string) {
  const labels: Record<string, string> = {
    IN_STOCK: 'In Stock',
    PREORDER: 'Pre-order',
    SOLD_OUT: 'Sold Out',
  };
  return labels[a] || 'Unavailable';
}

const isPurchasable = computed(() => {
  return Boolean(product.value?.isPurchasable && selectedVariant.value?.isPurchasable);
});

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString();
}

const isPreorder = computed(() => product.value?.saleType === 'PREORDER');

// Build checkout URL with variant
const checkoutUrl = computed(() => {
  const base = `/checkout/${product.value?.slug}`;
  if (selectedVariant.value) {
    return `${base}?variant=${selectedVariant.value.id}`;
  }
  return base;
});
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
      <div class="product-gallery">
        <div class="main-image">
          <img v-if="displayImage" :src="displayImage" :alt="product.name" />
          <div v-else class="placeholder">No Image</div>
        </div>
        <div v-if="hasMultipleImages" class="thumbnail-list">
          <button
            v-for="img in product.images"
            :key="img.id"
            class="thumbnail"
            :class="{ active: displayImage === img.imageUrl }"
            @click="selectImage(img.imageUrl)"
          >
            <img :src="img.imageUrl" :alt="img.altText || product.name" />
          </button>
        </div>
      </div>

      <div class="product-info">
        <NuxtLink :to="`/brands/${product.brand.slug}`" class="brand-link">
          {{ product.brand.name }}
        </NuxtLink>
        <h1 class="product-name">{{ product.name }}</h1>

        <div class="meta-row">
          <span class="meta-tag">{{ product.category.name }}</span>
          <span v-if="product.scale" class="meta-tag">{{ product.scale }}</span>
          <span class="meta-tag" :class="(displayAvailability || 'unavailable').toLowerCase().replace('_', '-')">
            {{ availabilityLabel(displayAvailability) }}
          </span>
        </div>

        <!-- Variant selector -->
        <div v-if="hasVariants && product.variants!.length > 1" class="variant-selector">
          <p class="variant-label">Edition</p>
          <div class="variant-buttons">
            <button
              v-for="v in product.variants"
              :key="v.id"
              class="variant-btn"
              :class="{ selected: v.id === selectedVariantId, soldout: v.isSoldOut }"
              :disabled="v.isSoldOut"
              @click="selectVariant(v)"
            >
              <span class="variant-btn-name">{{ v.name }}</span>
              <span class="variant-btn-price">${{ (v.priceCents / 100).toFixed(2) }}</span>
              <span v-if="v.isSoldOut" class="variant-btn-state">Sold Out</span>
            </button>
          </div>
          <p v-if="selectedVariant?.subtitle" class="variant-subtitle">
            {{ selectedVariant.subtitle }}
          </p>
        </div>

        <p class="price">{{ displayPrice }}</p>

        <div v-if="selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 3 && selectedVariant.isPurchasable" class="stock-warning">
          Only {{ selectedVariant.stock }} left in stock
        </div>

        <!-- Preorder info -->
        <div v-if="isPreorder" class="preorder-info">
          <p v-if="product.preorderStartAt || product.preorderEndAt" class="preorder-dates">
            <span v-if="product.preorderStartAt">Opens: {{ formatDate(product.preorderStartAt) }}</span>
            <span v-if="product.preorderEndAt"> · Closes: {{ formatDate(product.preorderEndAt) }}</span>
          </p>
          <p v-if="product.estimatedShipAt" class="ship-estimate">
            Estimated Ship: {{ formatDate(product.estimatedShipAt) }}
          </p>
        </div>

        <NuxtLink v-if="isPurchasable" :to="checkoutUrl" class="buy-now-btn">
          {{ displayAvailability === 'PREORDER' ? 'Pre-order Now' : 'Buy Now' }}
        </NuxtLink>
        <button v-else class="buy-now-btn disabled-btn" disabled>
          {{ availabilityLabel(displayAvailability) }}
        </button>

        <div v-if="product.description" class="description">
          <h3>Description</h3>
          <p>{{ product.description }}</p>
        </div>

        <!-- Variant specifications -->
        <div v-if="selectedVariant?.specifications" class="specifications">
          <h3>Specifications — {{ selectedVariant.name }}</h3>
          <p>{{ selectedVariant.specifications }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.back-link { display: inline-block; margin-bottom: 24px; color: #666; text-decoration: none; font-size: 0.9rem; }
.back-link:hover { color: #111; }

.product-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }
@media (max-width: 768px) { .product-detail { grid-template-columns: 1fr; } }

.product-gallery { display: flex; flex-direction: column; gap: 12px; }
.main-image { aspect-ratio: 1; background: #f9fafb; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
.main-image img { width: 100%; height: 100%; object-fit: cover; }
.placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 1rem; }

.thumbnail-list { display: flex; gap: 8px; flex-wrap: wrap; }
.thumbnail { width: 64px; height: 64px; border-radius: 6px; overflow: hidden; border: 2px solid transparent; cursor: pointer; padding: 0; background: #f9fafb; }
.thumbnail.active { border-color: #111; }
.thumbnail:hover:not(.active) { border-color: #d1d5db; }
.thumbnail img { width: 100%; height: 100%; object-fit: cover; }

.brand-link { display: inline-block; font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.04em; text-decoration: none; margin-bottom: 8px; }
.brand-link:hover { color: #111; }
.product-name { font-size: 1.5rem; font-weight: 700; margin: 0 0 12px; line-height: 1.3; }

.meta-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.meta-tag { font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; background: #f3f4f6; color: #555; }
.meta-tag.in-stock { background: #d1fae5; color: #065f46; }
.meta-tag.preorder { background: #fef3c7; color: #92400e; }
.meta-tag.sold-out { background: #fee2e2; color: #991b1b; }

/* Variant selector */
.variant-selector { margin-bottom: 16px; }
.variant-label { font-size: 0.8rem; color: #555; font-weight: 600; margin: 0 0 8px; }
.variant-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.variant-btn { display: flex; flex-direction: column; align-items: center; padding: 10px 16px; border: 2px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; min-width: 100px; }
.variant-btn.selected { border-color: #111; background: #f9fafb; }
.variant-btn:hover:not(.selected) { border-color: #d1d5db; }
.variant-btn:disabled { cursor: not-allowed; opacity: 0.6; }
.variant-btn.soldout { border-color: #fecaca; background: #fff5f5; }
.variant-btn-name { font-size: 0.85rem; font-weight: 600; }
.variant-btn-price { font-size: 0.75rem; color: #666; margin-top: 2px; }
.variant-btn-state { font-size: 0.7rem; color: #b91c1c; margin-top: 4px; }
.variant-subtitle { font-size: 0.8rem; color: #666; margin: 8px 0 0; font-style: italic; }

.price { font-size: 1.5rem; font-weight: 700; margin: 0 0 12px; }
.stock-warning { font-size: 0.8rem; color: #b91c1c; margin-bottom: 12px; }

.buy-now-btn { display: inline-block; padding: 12px 32px; background: #111; color: #fff; border-radius: 8px; font-size: 1rem; font-weight: 600; text-decoration: none; margin-bottom: 24px; }
.buy-now-btn:hover { background: #333; }
.disabled-btn { background: #9ca3af; cursor: not-allowed; border: none; font-size: 1rem; font-weight: 600; }
.disabled-btn:hover { background: #9ca3af; }

.preorder-info { background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 0.85rem; color: #92400e; }
.preorder-dates { margin: 0; }
.ship-estimate { margin: 4px 0 0; }

.description h3 { font-size: 1rem; margin: 0 0 8px; color: #333; }
.description p { color: #555; line-height: 1.6; margin: 0; }

.specifications { margin-top: 20px; }
.specifications h3 { font-size: 1rem; margin: 0 0 8px; color: #333; }
.specifications p { color: #555; line-height: 1.6; margin: 0; white-space: pre-line; }
</style>
