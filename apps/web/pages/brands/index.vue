<script setup lang="ts">
useSeoMeta({
  title: 'Brands — Wanjukong',
  description: 'Browse collectible figure brands including Hot Toys, DAM Toys, Threezero and more.',
})

const { fetchBrands } = useBrands();

const { data: brands, status } = useAsyncData('brands', fetchBrands);
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Brands</h1>
    <p class="page-subtitle">Browse our collection by brand.</p>

    <div v-if="status === 'pending'" class="loading-state">Loading brands...</div>

    <div v-else-if="!brands?.length" class="empty-state">
      <p>No brands found.</p>
    </div>

    <div v-else class="brand-grid">
      <BrandCard v-for="brand in brands" :key="brand.id" :brand="brand" />
    </div>
  </div>
</template>
