<script setup lang="ts">
// The richer order detail lives at /orders/[orderNo] and already supports
// logged-in customers via session.customerId. Forward there so both entry
// points render the same shipment/refund-aware layout.
definePageMeta({ middleware: 'account-auth' });

const route = useRoute();
const orderNo = route.params.orderNo as string;

await navigateTo(`/orders/${orderNo}`, { redirectCode: 302 });
</script>

<template><div /></template>
