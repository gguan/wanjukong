<script setup lang="ts">
useSeoMeta({
  title: 'Over Realm — Premium Collectible Figures',
  description: 'Curated collectible figures from Hot Toys, DAM, Threezero and the world\'s leading manufacturers. 1/6, 1/4, 1/12 scale. Worldwide shipping.',
  ogTitle: 'Over Realm — Premium Collectible Figures',
  ogDescription: 'Curated collectible figures from the world\'s leading manufacturers.',
  ogType: 'website',
})

const { fetchBrands } = useBrands();
const { fetchProducts } = useProducts();

const { data: brands } = useAsyncData('home-brands', fetchBrands);
const { data: featuredResp } = useAsyncData('home-featured', () => fetchProducts({ featured: 'true' }));
const { data: newestResp } = useAsyncData('home-newest', () => fetchProducts({ limit: '8' }));

const featuredProducts = computed(() => featuredResp.value?.data ?? []);
const heroProduct = computed(() => featuredProducts.value[0] ?? null);
const featuredRest = computed(() => featuredProducts.value.slice(1, 7));
const newArrivals = computed(() => newestResp.value?.data?.slice(0, 8) ?? []);
const displayBrands = computed(() => (brands.value ?? []).slice(0, 8));
</script>

<template>
  <div class="home">
    <!-- Full-bleed hero -->
    <section class="hero" :class="{ 'hero--has-image': heroProduct?.imageUrl }">
      <NuxtLink v-if="heroProduct" :to="`/products/${heroProduct.slug}`" class="hero-link">
        <img
          v-if="heroProduct.imageUrl"
          :src="heroProduct.imageUrl"
          :alt="heroProduct.name"
          class="hero-image"
        />
        <div class="hero-overlay">
          <div class="hero-inner">
            <p class="hero-eyebrow">{{ heroProduct.brand.name }}</p>
            <h1 class="hero-title">{{ heroProduct.name }}</h1>
            <p v-if="heroProduct.scale" class="hero-meta">{{ heroProduct.scale }} Scale</p>
            <span class="hero-cta">Shop Now →</span>
          </div>
        </div>
      </NuxtLink>
      <div v-else class="hero-inner hero-inner--fallback">
        <p class="hero-eyebrow">Over Realm</p>
        <h1 class="hero-title">Premium Collectible Figures</h1>
        <p class="hero-meta">Curated from the world's leading manufacturers</p>
        <NuxtLink to="/products" class="hero-cta">Browse Collection →</NuxtLink>
      </div>
    </section>

    <!-- Featured collection — large tiles -->
    <section v-if="featuredRest.length" class="collection">
      <div class="section-head">
        <h2 class="section-title">Featured</h2>
        <NuxtLink to="/products" class="section-link">View All</NuxtLink>
      </div>
      <div class="featured-grid">
        <NuxtLink
          v-for="p in featuredRest"
          :key="p.id"
          :to="`/products/${p.slug}`"
          class="featured-tile"
        >
          <div class="tile-media">
            <img v-if="p.imageUrl" :src="p.imageUrl" :alt="p.name" />
            <div v-else class="tile-placeholder" />
            <span v-if="p.displayAvailability === 'PREORDER'" class="tile-badge">Pre-order</span>
          </div>
          <div class="tile-meta">
            <p class="tile-brand">{{ p.brand.name }}</p>
            <p class="tile-name">{{ p.name }}</p>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Brand marquee -->
    <section v-if="displayBrands.length" class="brands">
      <div class="section-head section-head--center">
        <p class="section-eyebrow">Shop by Brand</p>
        <h2 class="section-title">Makers</h2>
      </div>
      <div class="brand-strip">
        <NuxtLink
          v-for="b in displayBrands"
          :key="b.id"
          :to="`/brands/${b.slug}`"
          class="brand-chip"
        >
          <img v-if="b.logo" :src="b.logo" :alt="b.name" class="brand-logo" />
          <span class="brand-name">{{ b.name }}</span>
        </NuxtLink>
      </div>
      <div class="section-foot">
        <NuxtLink to="/brands" class="section-link">All Brands →</NuxtLink>
      </div>
    </section>

    <!-- New arrivals -->
    <section v-if="newArrivals.length" class="arrivals">
      <div class="section-head">
        <h2 class="section-title">New Arrivals</h2>
        <NuxtLink to="/products" class="section-link">Shop All</NuxtLink>
      </div>
      <div class="arrivals-grid">
        <ProductCard v-for="p in newArrivals" :key="p.id" :product="p" />
      </div>
    </section>

    <!-- Editorial strip -->
    <section class="editorial">
      <div class="editorial-inner">
        <p class="editorial-eyebrow">Collecting, reimagined</p>
        <h2 class="editorial-title">
          The world's most sought-after figures,<br />delivered to your door.
        </h2>
        <div class="editorial-actions">
          <NuxtLink to="/products" class="btn-ghost">Shop Collection</NuxtLink>
          <NuxtLink to="/about" class="btn-text">About Us →</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  /* No page-container — homepage goes full bleed */
}

/* ─── Hero ──────────────────────────────────────────── */
.hero {
  position: relative;
  width: 100%;
  min-height: 85vh;
  background: #0a0a0a;
  color: #fff;
  overflow: hidden;
}

.hero-link {
  display: block;
  position: absolute;
  inset: 0;
  color: inherit;
  text-decoration: none;
}

.hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.85;
  transition: transform 6s ease;
}

.hero-link:hover .hero-image {
  transform: scale(1.03);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: 80px 8vw;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.75) 0%,
    rgba(0, 0, 0, 0.1) 50%,
    transparent 100%
  );
}

.hero-inner {
  max-width: 720px;
}

.hero-inner--fallback {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.hero-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  opacity: 0.7;
  margin: 0 0 14px;
}

.hero-title {
  font-size: clamp(2.4rem, 6vw, 4.8rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.05;
  margin: 0 0 12px;
}

.hero-meta {
  font-size: 0.95rem;
  opacity: 0.65;
  margin: 0 0 28px;
}

.hero-cta {
  display: inline-block;
  font-size: 0.85rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 14px 32px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: #fff;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}

.hero-cta:hover {
  background: #fff;
  color: #0a0a0a;
}

/* ─── Section scaffolding ────────────────────────────── */
.collection,
.arrivals,
.brands {
  padding: 96px 8vw;
  max-width: 1600px;
  margin: 0 auto;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 48px;
}

.section-head--center {
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 40px;
}

.section-eyebrow {
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #888;
  margin: 0 0 8px;
}

.section-title {
  font-size: clamp(1.8rem, 3.5vw, 2.6rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  margin: 0;
  color: #0a0a0a;
}

.section-link {
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #0a0a0a;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: 2px;
  transition: border-color 0.2s;
}

.section-link:hover {
  border-color: #0a0a0a;
}

.section-foot {
  margin-top: 32px;
  text-align: center;
}

/* ─── Featured grid (big tiles) ──────────────────────── */
.featured-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.featured-tile {
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
}

.tile-media {
  position: relative;
  aspect-ratio: 4 / 5;
  background: #f5f5f5;
  overflow: hidden;
  margin-bottom: 16px;
}

.tile-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.featured-tile:hover .tile-media img {
  transform: scale(1.04);
}

.tile-placeholder {
  width: 100%;
  height: 100%;
  background: #eee;
}

.tile-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.95);
  color: #0a0a0a;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.tile-meta {
  /* unstyled — text reads as a caption below image */
}

.tile-brand {
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #888;
  margin: 0 0 4px;
}

.tile-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: #0a0a0a;
  margin: 0;
  line-height: 1.3;
}

/* ─── Brand strip ────────────────────────────────────── */
.brands {
  background: #fafafa;
  max-width: none;
  margin: 0;
  padding-left: 8vw;
  padding-right: 8vw;
}

.brand-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  justify-content: center;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.brand-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 28px;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s;
}

.brand-chip:hover {
  opacity: 0.6;
}

.brand-logo {
  height: 48px;
  max-width: 140px;
  object-fit: contain;
  filter: grayscale(100%);
  transition: filter 0.2s;
}

.brand-chip:hover .brand-logo {
  filter: grayscale(0%);
}

.brand-name {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #333;
}

/* ─── Arrivals grid ──────────────────────────────────── */
.arrivals-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

/* ─── Editorial strip ────────────────────────────────── */
.editorial {
  background: #0a0a0a;
  color: #fff;
  padding: 120px 8vw;
  text-align: center;
}

.editorial-inner {
  max-width: 780px;
  margin: 0 auto;
}

.editorial-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  opacity: 0.5;
  margin: 0 0 20px;
}

.editorial-title {
  font-size: clamp(1.8rem, 4vw, 3rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin: 0 0 40px;
}

.editorial-actions {
  display: flex;
  gap: 32px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.btn-ghost {
  display: inline-block;
  padding: 14px 32px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: #fff;
  text-decoration: none;
  font-size: 0.85rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  transition: background 0.2s, color 0.2s;
}

.btn-ghost:hover {
  background: #fff;
  color: #0a0a0a;
}

.btn-text {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  transition: color 0.2s;
}

.btn-text:hover {
  color: #fff;
}

/* ─── Responsive ─────────────────────────────────────── */
@media (max-width: 900px) {
  .hero {
    min-height: 70vh;
  }

  .hero-overlay {
    padding: 48px 24px;
  }

  .collection,
  .arrivals,
  .brands {
    padding: 64px 24px;
  }

  .featured-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .arrivals-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .section-head {
    margin-bottom: 32px;
  }

  .editorial {
    padding: 80px 24px;
  }

  .brand-strip {
    gap: 24px;
  }

  .brand-chip {
    padding: 12px 16px;
  }

  .brand-logo {
    height: 36px;
    max-width: 100px;
  }
}

@media (max-width: 600px) {
  .featured-grid {
    grid-template-columns: 1fr;
  }

  .arrivals-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
</style>
