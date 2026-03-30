<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <section class="editor-section">
    <div class="editor-section__header">
      <div class="editor-section__header-row">
        <div>
          <h3 class="editor-section__title">{{ title }}</h3>
          <p v-if="description" class="editor-section__description">{{ description }}</p>
        </div>
        <div v-if="$slots['header-actions']" class="editor-section__header-actions">
          <slot name="header-actions" />
        </div>
      </div>
    </div>
    <div class="editor-section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.editor-section {
  background: #fff;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
}

.editor-section__header {
  padding: 16px 20px 0;
}

.editor-section__header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.editor-section__header-actions {
  flex-shrink: 0;
}

.editor-section__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.editor-section__description {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.editor-section__body {
  padding: 16px 20px 20px;
}
</style>
