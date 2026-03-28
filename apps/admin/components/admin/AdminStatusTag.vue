<script setup lang="ts">
const props = defineProps<{
  value: string;
}>();

const tagType = computed(() => {
  const map: Record<string, string> = {
    ACTIVE: 'success',
    DRAFT: 'info',
    INACTIVE: 'warning',
    IN_STOCK: 'success',
    PREORDER: '',
    SOLD_OUT: 'danger',
    COMING_SOON: 'warning',
  };
  return map[props.value] ?? 'info';
});

const label = computed(() => {
  const map: Record<string, string> = {
    ACTIVE: '上架',
    DRAFT: '草稿',
    INACTIVE: '下架',
    IN_STOCK: '现货',
    PREORDER: '预售',
    SOLD_OUT: '售罄',
    COMING_SOON: '即将发售',
  };
  return map[props.value] ?? props.value;
});
</script>

<template>
  <ElTag :type="tagType" size="small" disable-transitions>
    {{ label }}
  </ElTag>
</template>
