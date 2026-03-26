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
</script>

<template>
  <ElTag :type="tagType" size="small" disable-transitions>
    {{ value }}
  </ElTag>
</template>
