<script setup lang="ts">
const props = defineProps<{
  price: number | string;
}>();

const formatted = computed(() => {
  const num = typeof props.price === 'string' ? parseFloat(props.price) : props.price;
  return `$${num.toFixed(2)}`;
});
</script>

<template>
  <span class="product-price">{{ formatted }}</span>
</template>

<style scoped>
.product-price {
  font-weight: 700;
  color: #111;
}
</style>
