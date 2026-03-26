<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px">
    <h2 style="margin: 0; font-size: 1.25rem">{{ title }}</h2>
    <div>
      <slot name="actions" />
    </div>
  </div>
</template>
