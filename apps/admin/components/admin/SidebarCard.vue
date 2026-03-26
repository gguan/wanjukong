<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="sidebar-card">
    <div class="sidebar-card__header">
      <h4 class="sidebar-card__title">{{ title }}</h4>
    </div>
    <div class="sidebar-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="sidebar-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.sidebar-card {
  background: #fff;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
}

.sidebar-card__header {
  padding: 14px 16px 0;
}

.sidebar-card__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sidebar-card__body {
  padding: 12px 16px 16px;
}

.sidebar-card__footer {
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-light);
}
</style>
