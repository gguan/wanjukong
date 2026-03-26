<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="admin-page__header">
    <h2>{{ title }}</h2>
    <div class="admin-actions">
      <slot name="actions" />
    </div>
  </div>
</template>
