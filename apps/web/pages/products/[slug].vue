<script setup lang="ts">
import type { Product, ProductVariant } from '~/composables/useProducts';

const route = useRoute();
const slug = route.params.slug as string;
const { fetchProductBySlug, fetchProducts } = useProducts();

// ─── Product Data ────────────────────────────────────────
const { data: product, error, status } = useAsyncData(
  `product-${slug}`,
  () => fetchProductBySlug(slug),
);

// ─── Variant Selection ───────────────────────────────────
const selectedVariantId = ref<string | null>(null);
const quantity = ref(1);

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

const hasMultipleVariants = computed(() => (product.value?.variants?.length ?? 0) > 1);

// ─── Image Logic ─────────────────────────────────────────
const allImages = computed(() => {
  if (!product.value) return [];
  if (product.value.images?.length) {
    return product.value.images.map((img) => ({
      url: img.imageUrl,
      alt: img.altText || product.value!.name,
    }));
  }
  if (product.value.imageUrl) {
    return [{ url: product.value.imageUrl, alt: product.value.name }];
  }
  return [];
});

// ─── Lightbox ────────────────────────────────────────────
const lightboxOpen = ref(false);
const lightboxIndex = ref(0);

const lightboxImage = computed(() => {
  if (!allImages.value.length) return null;
  return allImages.value[lightboxIndex.value];
});

function openLightbox(index: number) {
  lightboxIndex.value = index;
  lightboxOpen.value = true;
}

function closeLightbox() {
  lightboxOpen.value = false;
}

function lightboxPrev() {
  lightboxIndex.value = lightboxIndex.value > 0
    ? lightboxIndex.value - 1
    : allImages.value.length - 1;
}

function lightboxNext() {
  lightboxIndex.value = lightboxIndex.value < allImages.value.length - 1
    ? lightboxIndex.value + 1
    : 0;
}

function onLightboxKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxPrev();
  if (e.key === 'ArrowRight') lightboxNext();
}

watch(lightboxOpen, (open) => {
  if (import.meta.client) {
    if (open) {
      document.addEventListener('keydown', onLightboxKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', onLightboxKey);
      document.body.style.overflow = '';
    }
  }
});

// ─── Price / Availability ────────────────────────────────
const displayPrice = computed(() => {
  if (selectedVariant.value?.priceCents !== undefined) {
    return `$${(selectedVariant.value.priceCents / 100).toFixed(2)}`;
  }
  return '$0.00';
});

const displayAvailability = computed(() => product.value?.displayAvailability);

const isPurchasable = computed(() => {
  return Boolean(product.value?.isPurchasable && selectedVariant.value?.isPurchasable);
});

const isPreorder = computed(() => product.value?.saleType === 'PREORDER');
const isSoldOut = computed(() => product.value?.displayAvailability === 'SOLD_OUT');

const shipQuarter = computed(() => {
  const iso = selectedVariant.value?.estimatedShipAt || product.value?.estimatedShipAt;
  if (!iso) return null;
  const d = new Date(iso);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
});

function variantShipHint(v: ProductVariant): string | null {
  if (!v.estimatedShipAt) return null;
  const d = new Date(v.estimatedShipAt);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Ships Q${q} ${d.getFullYear()}`;
}

// ─── Cart ─────────────────────────────────────────────────
const { addToCart } = useCart();
const addedToCart = ref(false);

function handleAddToCart() {
  if (!product.value || !selectedVariant.value) return;
  addToCart({
    productId: product.value.id,
    variantId: selectedVariant.value.id,
    quantity: quantity.value,
    productName: product.value.name,
    productSlug: product.value.slug,
    brandName: product.value.brand?.name || '',
    variantName: selectedVariant.value.name,
    priceCents: selectedVariant.value.priceCents,
    imageUrl: selectedVariant.value.coverImageUrl || product.value.imageUrl || null,
  });
  addedToCart.value = true;
  setTimeout(() => { addedToCart.value = false; }, 2000);
}

// ─── SEO ──────────────────────────────────────────────────
watchEffect(() => {
  if (!product.value) return;
  useSeoMeta({
    title: `${product.value.name} — Wanjukong`,
    description: product.value.description?.slice(0, 160) || `${product.value.name} by ${product.value.brand?.name}. ${product.value.scale || ''} scale collectible figure.`,
    ogTitle: product.value.name,
    ogDescription: product.value.description?.slice(0, 160) || `${product.value.name} by ${product.value.brand?.name}`,
    ogImage: product.value.imageUrl || undefined,
  })
})

// ─── Related Products ────────────────────────────────────
const relatedProducts = ref<Product[]>([]);

watch(product, async (p) => {
  if (!p) return;
  try {
    const result = await fetchProducts({ brand: p.brand.slug });
    relatedProducts.value = result.data.filter((item) => item.slug !== p.slug).slice(0, 4);
  } catch {
    relatedProducts.value = [];
  }
}, { immediate: true });

// ─── Actions ─────────────────────────────────────────────
function selectVariant(v: ProductVariant) {
  selectedVariantId.value = v.id;
}

function incrementQty() {
  if (quantity.value < 10) quantity.value++;
}

function decrementQty() {
  if (quantity.value > 1) quantity.value--;
}

function availabilityLabel(a: string | null | undefined) {
  const labels: Record<string, string> = {
    IN_STOCK: 'In Stock',
    PREORDER: 'Pre-order',
    SOLD_OUT: 'Sold Out',
  };
  return labels[a || ''] || 'Unavailable';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>

<template>
  <div class="pdp-page">
    <!-- Loading -->
    <div v-if="status === 'pending'" class="loading-state">Loading product...</div>

    <!-- Error -->
    <div v-else-if="error || !product" class="error-state">
      <h2>Product not found</h2>
      <p>The product you are looking for does not exist or is no longer available.</p>
      <NuxtLink to="/products" class="error-link">Browse all products</NuxtLink>
    </div>

    <template v-else>
      <!-- Breadcrumb -->
      <div class="pdp-breadcrumb">
        <UiBreadcrumb :items="[
          { label: 'Home', to: '/' },
          { label: 'Products', to: '/products' },
          { label: product.brand.name, to: `/brands/${product.brand.slug}` },
          { label: product.name },
        ]" />
      </div>

      <!-- ═══ HERO: stacked images left + info right ═══ -->
      <section class="pdp-hero">
        <div class="hero-inner">
          <div class="hero-grid">
            <!-- LEFT: Vertically stacked images -->
            <div class="pdp-gallery">
              <div
                v-for="(img, idx) in allImages"
                :key="idx"
                class="gallery-image-wrap"
                @click="openLightbox(idx)"
              >
                <img :src="img.url" :alt="img.alt" class="gallery-image" />
              </div>
              <!-- Fallback if no images -->
              <div v-if="!allImages.length" class="gallery-image-wrap">
                <div class="placeholder">No Image</div>
              </div>
            </div>

            <!-- RIGHT: Purchase panel + Overview + Specs -->
            <div class="pdp-panel">
              <!-- Brand -->
              <NuxtLink :to="`/brands/${product.brand.slug}`" class="panel-brand">
                {{ product.brand.name }}
              </NuxtLink>

              <!-- Title -->
              <h1 class="panel-title">{{ product.name }}</h1>

              <!-- Price -->
              <p class="panel-price">{{ displayPrice }}</p>

              <!-- Sold Out banner -->
              <div v-if="isSoldOut" class="panel-sold-out">Sold Out</div>

              <!-- Subtitle -->
              <p v-if="selectedVariant?.subtitle" class="panel-subtitle">
                {{ selectedVariant.subtitle }}
              </p>

              <!-- Version selector -->
              <div v-if="hasMultipleVariants" class="panel-versions">
                <p class="panel-label">Edition</p>
                <div class="version-pills">
                  <button
                    v-for="v in product.variants"
                    :key="v.id"
                    class="version-pill"
                    :class="{ selected: v.id === selectedVariantId, soldout: v.isSoldOut }"
                    :disabled="v.isSoldOut"
                    @click="selectVariant(v)"
                  >
                    <span class="pill-name">{{ v.name }}</span>
                    <span class="pill-price">${{ (v.priceCents / 100).toFixed(2) }}</span>
                    <span v-if="v.isSoldOut" class="pill-sold">Sold Out</span>
                    <span v-else-if="variantShipHint(v)" class="pill-ship">{{ variantShipHint(v) }}</span>
                  </button>
                </div>
              </div>

              <!-- Spec summary -->
              <p v-if="selectedVariant?.specSummary" class="panel-spec-summary">
                {{ selectedVariant.specSummary }}
              </p>

              <!-- Preorder summary -->
              <div v-if="isPreorder" class="panel-preorder">
                <div v-if="shipQuarter" class="preorder-ship">
                  PRE-ORDER FOR {{ shipQuarter }} SHIPPING
                </div>
                <div v-if="product.preorderStartAt || product.preorderEndAt" class="preorder-dates">
                  <span v-if="product.preorderStartAt">Opens {{ formatDate(product.preorderStartAt) }}</span>
                  <span v-if="product.preorderEndAt"> – Closes {{ formatDate(product.preorderEndAt) }}</span>
                </div>
              </div>

              <!-- Stock warning -->
              <div
                v-if="selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 3 && selectedVariant.isPurchasable"
                class="panel-stock-warn"
              >
                Only {{ selectedVariant.stock }} left in stock
              </div>

              <!-- Quantity + Actions -->
              <div class="panel-actions">
                <div v-if="isPurchasable" class="qty-row">
                  <span class="qty-label">Qty</span>
                  <div class="qty-control">
                    <button class="qty-btn" :disabled="quantity <= 1" @click="decrementQty">−</button>
                    <input
                      v-model.number="quantity"
                      type="number"
                      class="qty-input"
                      min="1"
                      max="10"
                    />
                    <button class="qty-btn" :disabled="quantity >= 10" @click="incrementQty">+</button>
                  </div>
                </div>

                <button
                  v-if="isPurchasable"
                  class="btn-primary"
                  :class="{ 'btn-added': addedToCart }"
                  @click="handleAddToCart"
                >
                  {{ addedToCart ? 'Added!' : isPreorder ? 'Pre-order' : 'Add to Cart' }}
                </button>
                <button v-else class="btn-primary btn-disabled" disabled>
                  {{ availabilityLabel(displayAvailability) }}
                </button>
              </div>

              <!-- Small meta -->
              <div class="panel-meta">
                <span v-if="product.scale">{{ product.scale }}</span>
                <span>{{ product.category.name }}</span>
              </div>

              <!-- ─── Divider ─── -->
              <hr class="panel-divider" />

              <!-- ─── Product description (plain text, preserves line breaks) ─── -->
              <p v-if="product.description" class="panel-product-description">{{ product.description }}</p>

              <!-- ─── Specifications (rich text) ─── -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-if="selectedVariant?.specifications" class="panel-description" v-html="selectedVariant.specifications" />
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ LIGHTBOX ═══ -->
      <Teleport to="body">
        <div v-if="lightboxOpen" class="lightbox-overlay" @click.self="closeLightbox">
          <button class="lightbox-close" @click="closeLightbox">&times;</button>
          <button v-if="allImages.length > 1" class="lightbox-arrow lightbox-prev" @click="lightboxPrev">&#8249;</button>
          <img v-if="lightboxImage" :src="lightboxImage.url" :alt="lightboxImage.alt" class="lightbox-img" />
          <button v-if="allImages.length > 1" class="lightbox-arrow lightbox-next" @click="lightboxNext">&#8250;</button>
          <div v-if="allImages.length > 1" class="lightbox-counter">{{ lightboxIndex + 1 }} / {{ allImages.length }}</div>
        </div>
      </Teleport>

      <!-- ═══ BRAND / CREDITS ═══ -->
      <section class="pdp-section">
        <div class="section-inner">
          <div class="brand-credit">
            <div v-if="product.brand.logo" class="brand-logo-wrap">
              <img :src="product.brand.logo" :alt="product.brand.name" class="brand-logo" />
            </div>
            <div class="brand-credit-info">
              <p class="brand-credit-name">{{ product.brand.name }}</p>
              <NuxtLink :to="`/brands/${product.brand.slug}`" class="brand-credit-link">
                View all {{ product.brand.name }} products &rarr;
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ RELATED PRODUCTS ═══ -->
      <section v-if="relatedProducts?.length" class="pdp-section pdp-section--alt">
        <div class="section-inner">
          <h2 class="section-title">You Might Also Like</h2>
          <div class="related-grid">
            <ProductCard v-for="p in relatedProducts" :key="p.id" :product="p" />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════ */
.pdp-page {
  background: #fff;
}
.pdp-breadcrumb {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px 0;
}

@media (min-width: 1024px) {
  .pdp-breadcrumb {
    padding-left: 160px;
    padding-right: 160px;
  }
}

.error-link {
  display: inline-block;
  margin-top: 16px;
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
}
.error-link:hover { color: #111; }

/* ═══════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════ */
.pdp-hero {
  padding: 0 24px;
}
.hero-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding-top: 32px;
}

@media (min-width: 1024px) {
  .pdp-hero {
    padding-left: 160px;
    padding-right: 160px;
  }
  .pdp-section {
    padding-left: 160px;
    padding-right: 160px;
  }
}
.hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
}

/* ═══════════════════════════════════════════════════════════
   GALLERY — vertically stacked images
   ═══════════════════════════════════════════════════════════ */
.pdp-gallery {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.gallery-image-wrap {
  background: #f5f5f5;
  cursor: zoom-in;
  overflow: hidden;
}
.gallery-image {
  width: 100%;
  display: block;
  object-fit: contain;
}
.placeholder {
  aspect-ratio: 3 / 2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  font-size: 0.9rem;
}

/* ═══════════════════════════════════════════════════════════
   LIGHTBOX
   ═══════════════════════════════════════════════════════════ */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lightbox-img {
  max-width: 85vw;
  max-height: 85vh;
  object-fit: contain;
}
.lightbox-close {
  position: absolute;
  top: 16px;
  right: 20px;
  background: none;
  border: none;
  color: #fff;
  font-size: 2.5rem;
  cursor: pointer;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.15s;
  z-index: 10;
}
.lightbox-close:hover { opacity: 1; }
.lightbox-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #fff;
  font-size: 3rem;
  cursor: pointer;
  padding: 16px;
  opacity: 0.6;
  transition: opacity 0.15s;
  z-index: 10;
}
.lightbox-arrow:hover { opacity: 1; }
.lightbox-prev { left: 16px; }
.lightbox-next { right: 16px; }
.lightbox-counter {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  letter-spacing: 0.1em;
}

/* ═══════════════════════════════════════════════════════════
   PURCHASE PANEL (right column — sticky)
   ═══════════════════════════════════════════════════════════ */
.pdp-panel {
  position: sticky;
  top: 72px;
  padding: 8px 0 64px;
}

/* Brand */
.panel-brand {
  display: block;
  font-family: 'Jost', sans-serif;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  text-decoration: none;
  margin-bottom: 8px;
  font-weight: 400;
  transition: color 0.15s;
}
.panel-brand:hover { color: #222; }

/* Title — futura-pt style: light weight, large */
.panel-title {
  font-family: 'Jost', sans-serif;
  font-size: 1.75rem;
  font-weight: 400;
  line-height: 1.2;
  margin: 0 0 12px;
  letter-spacing: 0;
  color: #222;
}

/* Price — same font, light weight */
.panel-price {
  font-family: 'Jost', sans-serif;
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0 0 20px;
  color: #222;
}

/* Subtitle — serif body font */
.panel-subtitle {
  font-family: 'Jost', sans-serif;
  font-size: 0.9rem;
  color: #1d1d1d;
  margin: -12px 0 20px;
  line-height: 1.6;
}

/* Version selector */
.panel-versions {
  margin-bottom: 20px;
}
.panel-label {
  font-family: 'Jost', sans-serif;
  font-size: 0.8rem;
  color: #222;
  font-weight: 500;
  margin: 0 0 8px;
}
.version-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.version-pill {
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 0;
  background: #fff;
  cursor: pointer;
  min-width: 110px;
  text-align: center;
  transition: border-color 0.15s;
}
.version-pill.selected {
  border-color: #111;
}
.version-pill:hover:not(.selected):not(:disabled) {
  border-color: #999;
}
.version-pill:disabled { cursor: not-allowed; }
.version-pill.soldout { opacity: 0.35; }
.pill-name {
  font-family: 'Jost', sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  display: block;
}
.pill-price {
  font-family: 'Jost', sans-serif;
  font-size: 0.75rem;
  color: #888;
  display: block;
  margin-top: 2px;
}
.pill-sold {
  font-size: 0.65rem;
  color: #b91c1c;
  display: block;
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Sold Out banner */
.panel-sold-out {
  font-family: 'Jost', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #991b1b;
  background: #fee2e2;
  padding: 8px 14px;
  margin-bottom: 16px;
  text-align: center;
}

/* Spec summary */
.panel-spec-summary {
  font-family: 'Jost', sans-serif;
  font-size: 0.8rem;
  color: #666;
  line-height: 1.5;
  margin: -8px 0 16px;
}

/* Variant ship hint */
.pill-ship {
  font-size: 0.6rem;
  color: #92400e;
  display: block;
  margin-top: 3px;
  letter-spacing: 0.02em;
}

/* Preorder */
.panel-preorder {
  margin-bottom: 16px;
}
.preorder-ship {
  font-family: 'Jost', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: #222;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.preorder-dates {
  font-size: 0.8rem;
  color: #888;
}

/* Stock warning */
.panel-stock-warn {
  font-size: 0.8rem;
  color: #b91c1c;
  margin-bottom: 12px;
  font-weight: 500;
}

/* Quantity + Actions */
.panel-actions {
  margin-bottom: 16px;
}
.qty-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.qty-label {
  font-family: 'Jost', sans-serif;
  font-size: 0.8rem;
  color: #222;
  font-weight: 500;
}
.qty-control {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  overflow: hidden;
}
.qty-btn {
  width: 34px;
  height: 34px;
  border: none;
  background: #fff;
  cursor: pointer;
  font-size: 1rem;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
}
.qty-btn:hover:not(:disabled) { background: #f5f5f5; }
.qty-btn:disabled { color: #ccc; cursor: not-allowed; }
.qty-input {
  width: 40px;
  height: 34px;
  border: none;
  border-left: 1px solid #ddd;
  border-right: 1px solid #ddd;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: #111;
  -moz-appearance: textfield;
}
.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* CTA */
.btn-primary {
  display: block;
  width: 100%;
  padding: 14px;
  background: #222;
  color: #fff;
  border: none;
  font-family: 'Jost', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: #333; }
.btn-added { background: #0f766e !important; }
.btn-added:hover { background: #0d6460 !important; }
.btn-disabled {
  background: #ccc;
  color: #888;
  cursor: not-allowed;
}
.btn-disabled:hover { background: #ccc; }

/* Meta (scale, category) */
.panel-meta {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  font-family: 'Jost', sans-serif;
  font-size: 0.75rem;
  color: #999;
  font-weight: 400;
}

/* Divider */
.panel-divider {
  border: none;
  border-top: 1px solid #eee;
  margin: 24px 0;
}

/* Product description (plain text) */
.panel-product-description {
  font-family: 'Jost', sans-serif;
  font-size: 0.9rem;
  line-height: 1.75;
  color: #444;
  white-space: pre-line;
  margin: 0 0 20px;
}

/* ═══════════════════════════════════════════════════════════
   PANEL DESCRIPTION (rich text)
   ═══════════════════════════════════════════════════════════ */
.panel-description {
  font-family: 'Jost', sans-serif;
  font-size: 0.9rem;
  line-height: 1.7;
  color: #1d1d1d;
}
.panel-description :deep(p) {
  margin: 0 0 12px;
}
.panel-description :deep(p:last-child) {
  margin-bottom: 0;
}
.panel-description :deep(ul),
.panel-description :deep(ol) {
  padding-left: 20px;
  margin: 0 0 12px;
}
.panel-description :deep(li) {
  margin-bottom: 4px;
}
.panel-description :deep(strong) {
  font-weight: 600;
  color: #111;
}
.panel-description :deep(em) {
  font-style: italic;
}
.panel-description :deep(a) {
  color: #222;
  text-decoration: underline;
}

/* ═══════════════════════════════════════════════════════════
   BOTTOM SECTIONS
   ═══════════════════════════════════════════════════════════ */
.pdp-section {
  padding: 48px 24px;
  border-top: 1px solid #eee;
}
.pdp-section--alt {
  background: #fafafa;
}
.section-inner {
  max-width: 1200px;
  margin: 0 auto;
}
.section-title {
  font-family: 'Jost', sans-serif;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 500;
  margin: 0 0 24px;
  color: #222;
}

/* Brand credits */
.brand-credit {
  display: flex;
  align-items: center;
  gap: 16px;
}
.brand-logo-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: #f5f5f5;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 6px;
}
.brand-credit-name {
  font-family: 'Jost', sans-serif;
  font-size: 1rem;
  font-weight: 400;
  margin: 0 0 4px;
  color: #222;
}
.brand-credit-link {
  font-size: 0.8rem;
  color: #888;
  text-decoration: none;
  transition: color 0.15s;
}
.brand-credit-link:hover { color: #111; }

/* Related products */
.related-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

/* ═══════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .hero-grid { gap: 36px; }
  .related-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 840px) {
  .hero-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .pdp-panel {
    position: static;
    padding: 0 0 40px;
  }
  .panel-title { font-size: 1.3rem; }
  .panel-price { font-size: 1.25rem; }
  .related-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 480px) {
  .pdp-hero { padding: 0; }
  .hero-inner { padding-top: 0; }
  .pdp-panel { padding: 0 20px 40px; }
  .gallery-image-wrap { margin: 0; }
  .pdp-section { padding: 36px 20px; }
  .related-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
