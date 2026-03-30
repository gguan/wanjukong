<script setup lang="ts">
const props = defineProps<{
  value: string;
}>();

type ElTagType = 'primary' | 'success' | 'warning' | 'danger' | 'info' | undefined;

const tagType = computed<ElTagType>(() => {
  const map: Record<string, ElTagType> = {
    ACTIVE: 'success',
    DRAFT: 'info',
    INACTIVE: 'warning',
    IN_STOCK: 'success',
    PREORDER: undefined,
    SOLD_OUT: 'danger',
    COMING_SOON: 'warning',
    // Order statuses
    PENDING: 'warning',
    CONFIRMED: 'success',
    CANCELLED: 'danger',
    // Payment statuses
    UNPAID: 'warning',
    PAID: 'success',
    FAILED: 'danger',
    REFUNDED: 'info',
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
    // Order statuses
    PENDING: '待处理',
    CONFIRMED: '已确认',
    CANCELLED: '已取消',
    // Payment statuses
    UNPAID: '未付款',
    PAID: '已付款',
    FAILED: '付款失败',
    REFUNDED: '已退款',
  };
  return map[props.value] ?? props.value;
});
</script>

<template>
  <ElTag :type="tagType" size="small" disable-transitions>
    {{ label }}
  </ElTag>
</template>
