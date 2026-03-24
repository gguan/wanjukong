<script setup lang="ts">
import type { Brand } from '~/composables/useBrands';

defineProps<{
  brand: Brand;
}>();
</script>

<template>
  <NuxtLink :to="`/brands/${brand.slug}`" class="brand-card">
    <div class="brand-logo">
      <img v-if="brand.logo" :src="brand.logo" :alt="brand.name" />
      <span v-else class="brand-initial">{{ brand.name.charAt(0) }}</span>
    </div>
    <h3 class="brand-name">{{ brand.name }}</h3>
  </NuxtLink>
</template>

<style scoped>
.brand-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: inherit;
  padding: 24px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: box-shadow 0.2s, transform 0.2s;
}

.brand-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.brand-logo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  overflow: hidden;
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

.brand-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
}
</style>
