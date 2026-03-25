<script setup lang="ts">
const route = useRoute();
const orderNo = route.params.orderNo as string;
const { fetchOrderByNo } = useOrders();

const { data: order, error, status } = useAsyncData(
  `order-${orderNo}`,
  () => fetchOrderByNo(orderNo),
);

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    CANCELLED: 'Cancelled',
  };
  return map[s] || s;
}

function paymentLabel(s: string) {
  const map: Record<string, string> = {
    UNPAID: 'Awaiting Payment',
    PAID: 'Paid',
    FAILED: 'Payment Failed',
    REFUNDED: 'Refunded',
  };
  return map[s] || s;
}
</script>

<template>
  <div class="page-container">
    <div v-if="status === 'pending'" class="loading-state">Loading order...</div>

    <div v-else-if="error || !order" class="error-state">
      <h2>Order not found</h2>
      <p>We couldn't find an order with that number.</p>
      <NuxtLink to="/products">Browse products</NuxtLink>
    </div>

    <div v-else class="order-page">
      <div class="confirmation-banner">
        <h1>Order Created</h1>
        <p>Thank you, {{ order.fullName }}! Your order has been received.</p>
      </div>

      <div class="order-header">
        <div class="header-row">
          <span class="label">Order No</span>
          <span class="value mono">{{ order.orderNo }}</span>
        </div>
        <div class="header-row">
          <span class="label">Date</span>
          <span class="value">{{ formatDate(order.createdAt) }}</span>
        </div>
        <div class="header-row">
          <span class="label">Status</span>
          <span class="badge" :class="order.status.toLowerCase()">
            {{ statusLabel(order.status) }}
          </span>
        </div>
        <div class="header-row">
          <span class="label">Payment</span>
          <span class="badge" :class="order.paymentStatus.toLowerCase()">
            {{ paymentLabel(order.paymentStatus) }}
          </span>
        </div>
      </div>

      <!-- Items -->
      <div class="section">
        <h3>Items</h3>
        <div v-for="item in order.items" :key="item.id" class="order-item">
          <div class="item-image">
            <img v-if="item.coverImageUrlSnapshot" :src="item.coverImageUrlSnapshot" :alt="item.productNameSnapshot" />
            <div v-else class="placeholder">No Image</div>
          </div>
          <div class="item-info">
            <p class="item-brand" v-if="item.brandNameSnapshot">{{ item.brandNameSnapshot }}</p>
            <p class="item-name">{{ item.productNameSnapshot }}</p>
            <p v-if="item.variantNameSnapshot" class="item-variant">{{ item.variantNameSnapshot }}</p>
            <div class="item-meta">
              <span v-if="item.skuSnapshot">{{ item.skuSnapshot }}</span>
              <span v-if="item.categoryNameSnapshot">{{ item.categoryNameSnapshot }}</span>
              <span v-if="item.scaleSnapshot">{{ item.scaleSnapshot }}</span>
            </div>
          </div>
          <div class="item-pricing">
            <p class="item-unit">{{ formatCents(item.unitPriceCents) }} × {{ item.quantity }}</p>
            <p class="item-total">{{ formatCents(item.totalPriceCents) }}</p>
          </div>
        </div>
      </div>

      <!-- Totals -->
      <div class="section totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>{{ formatCents(order.subtotalPriceCents) }}</span>
        </div>
        <div class="total-row grand">
          <span>Total ({{ order.currency }})</span>
          <span>{{ formatCents(order.totalPriceCents) }}</span>
        </div>
      </div>

      <!-- Shipping info -->
      <div class="section">
        <h3>Shipping Address</h3>
        <div class="address">
          <p>{{ order.fullName }}</p>
          <p>{{ order.addressLine1 }}</p>
          <p v-if="order.addressLine2">{{ order.addressLine2 }}</p>
          <p>{{ order.city }}<span v-if="order.stateOrProvince">, {{ order.stateOrProvince }}</span> {{ order.postalCode }}</p>
          <p>{{ order.country }}</p>
        </div>
      </div>

      <!-- Contact -->
      <div class="section">
        <h3>Contact</h3>
        <p>{{ order.email }}</p>
        <p v-if="order.phone">{{ order.phone }}</p>
      </div>

      <NuxtLink to="/products" class="continue-link">Continue Shopping &rarr;</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.order-page {
  max-width: 640px;
}

.confirmation-banner {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 24px;
}

.confirmation-banner h1 {
  font-size: 1.25rem;
  margin: 0 0 6px;
  color: #166534;
}

.confirmation-banner p {
  margin: 0;
  color: #15803d;
  font-size: 0.9rem;
}

.order-header {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.header-row .label {
  color: #888;
  font-size: 0.85rem;
}

.header-row .value {
  font-size: 0.9rem;
}

.mono {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.85rem;
}

.badge {
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.badge.pending { background: #fef3c7; color: #92400e; }
.badge.confirmed { background: #d1fae5; color: #065f46; }
.badge.cancelled { background: #fee2e2; color: #991b1b; }
.badge.unpaid { background: #fef3c7; color: #92400e; }
.badge.paid { background: #d1fae5; color: #065f46; }
.badge.failed { background: #fee2e2; color: #991b1b; }
.badge.refunded { background: #e0e7ff; color: #3730a3; }

.section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.section h3 {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 12px;
  color: #333;
}

.order-item {
  display: flex;
  gap: 12px;
  align-items: center;
}

.item-image {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  font-size: 0.65rem;
}

.item-info {
  flex: 1;
}

.item-brand {
  font-size: 0.7rem;
  color: #888;
  text-transform: uppercase;
  margin: 0 0 2px;
}

.item-name {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 2px;
}

.item-variant {
  font-size: 0.8rem;
  color: #555;
  margin: 0 0 4px;
}

.item-meta {
  display: flex;
  gap: 8px;
  font-size: 0.7rem;
  color: #666;
}

.item-pricing {
  text-align: right;
  flex-shrink: 0;
}

.item-unit {
  font-size: 0.75rem;
  color: #888;
  margin: 0 0 2px;
}

.item-total {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

.totals {
  background: #f9fafb;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 0.9rem;
  color: #555;
}

.total-row.grand {
  font-weight: 700;
  color: #111;
  font-size: 1rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
  margin-top: 4px;
}

.address p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #555;
}

.continue-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 0.9rem;
  color: #111;
  text-decoration: none;
  font-weight: 500;
}

.continue-link:hover {
  text-decoration: underline;
}
</style>
