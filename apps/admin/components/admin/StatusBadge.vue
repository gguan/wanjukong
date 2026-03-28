<script setup lang="ts">
const props = defineProps<{
  value: string;
  size?: 'small' | 'default';
}>();

const config = computed(() => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    ACTIVE: { label: '上架', color: '#16a34a', bg: '#f0fdf4' },
    DRAFT: { label: '草稿', color: '#6b7280', bg: '#f3f4f6' },
    INACTIVE: { label: '下架', color: '#d97706', bg: '#fffbeb' },
    IN_STOCK: { label: '现货', color: '#16a34a', bg: '#f0fdf4' },
    PREORDER: { label: '预售', color: '#7c3aed', bg: '#f5f3ff' },
    SOLD_OUT: { label: '售罄', color: '#dc2626', bg: '#fef2f2' },
    COMING_SOON: { label: '即将发售', color: '#d97706', bg: '#fffbeb' },
  };
  return map[props.value] || { label: props.value, color: '#6b7280', bg: '#f3f4f6' };
});
</script>

<template>
  <span
    class="status-badge"
    :class="{ 'status-badge--small': size === 'small' }"
    :style="{ color: config.color, background: config.bg }"
  >
    <span class="status-badge__dot" :style="{ background: config.color }" />
    {{ config.label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
}

.status-badge--small {
  padding: 2px 8px;
  font-size: 11px;
  gap: 4px;
}

.status-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-badge--small .status-badge__dot {
  width: 5px;
  height: 5px;
}
</style>
