<script setup lang="ts">
defineProps<{
  items: { label: string; to?: string }[];
}>();
</script>

<template>
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol>
      <li v-for="(item, idx) in items" :key="idx">
        <NuxtLink v-if="item.to && idx < items.length - 1" :to="item.to">{{ item.label }}</NuxtLink>
        <span v-else class="current">{{ item.label }}</span>
        <span v-if="idx < items.length - 1" class="sep">/</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb ol {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  padding: 0;
  margin: 0;
  font-size: 0.8rem;
}

.breadcrumb li {
  display: flex;
  align-items: center;
}

.breadcrumb a {
  color: #888;
  text-decoration: none;
  transition: color 0.15s;
}

.breadcrumb a:hover {
  color: #111;
}

.sep {
  margin: 0 8px;
  color: #ccc;
}

.current {
  color: #333;
}
</style>
