<script setup lang="ts">
const props = defineProps<{
  value: string;
}>();

type ElTagType = 'primary' | 'success' | 'warning' | 'danger' | 'info' | undefined;

const tagType = computed<ElTagType>(() => {
  const map: Record<string, ElTagType> = {
    ACTIVE: 'success',
    DRAFT: 'info',
    PENDING_REVIEW: 'warning',
    INACTIVE: 'danger',
    IN_STOCK: 'success',
    PREORDER: undefined,
    SOLD_OUT: 'danger',
    COMING_SOON: 'warning',
    // Order statuses
    PENDING: 'warning',
    CONFIRMED: 'success',
    SHIPPED: 'primary',
    DELIVERED: 'success',
    CANCELLED: 'danger',
    // Payment statuses
    UNPAID: 'warning',
    DEPOSIT_PAID: 'warning',
    PAID: 'success',
    FAILED: 'danger',
    REFUNDED: 'info',
  };
  return map[props.value] ?? 'info';
});

const label = computed(() => {
  const map: Record<string, string> = {
    ACTIVE: '已上架',
    DRAFT: '草稿',
    PENDING_REVIEW: '待审核',
    INACTIVE: '已下架',
    IN_STOCK: '现货',
    PREORDER: '预售',
    SOLD_OUT: '售罄',
    COMING_SOON: '即将发售',
    // Order statuses
    PENDING: '待处理',
    CONFIRMED: '已确认',
    SHIPPED: '已发货',
    DELIVERED: '已签收',
    CANCELLED: '已取消',
    // Payment statuses
    UNPAID: '未付款',
    DEPOSIT_PAID: '待付尾款',
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
