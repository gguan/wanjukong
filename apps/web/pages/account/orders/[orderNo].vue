<script setup lang="ts">
definePageMeta({ middleware: 'account-auth' });

const route = useRoute();
const orderNo = route.params.orderNo as string;
const { getOrder } = useAccount();
const { logout } = useStorefrontAuth();

const order = ref<any>(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    order.value = await getOrder(orderNo);
  } catch {
    error.value = 'Failed to load order.';
  } finally {
    loading.value = false;
  }
});

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
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
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

function statusClass(s: string) {
  return s.toLowerCase();
}

async function handleLogout() {
  await logout();
  navigateTo('/login');
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">My Account</h1>

    <div class="account-layout">
      <nav class="account-sidebar">
        <NuxtLink to="/account" class="nav-item">Profile</NuxtLink>
        <NuxtLink to="/account/addresses" class="nav-item">Addresses</NuxtLink>
        <NuxtLink to="/account/orders" class="nav-item active">Orders</NuxtLink>
        <button class="nav-item nav-logout" @click="handleLogout">Logout</button>
      </nav>

      <div class="account-main">
        <NuxtLink to="/account/orders" class="back-link">&larr; Back to Orders</NuxtLink>

        <div v-if="loading" class="loading-state">Loading order...</div>

        <div v-else-if="error" class="form-error">{{ error }}</div>

        <div v-else-if="!order" class="error-state">
          <p>Order not found.</p>
        </div>

        <div v-else class="order-detail">
          <!-- Order header -->
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
              <span class="badge" :class="statusClass(order.status)">
                {{ statusLabel(order.status) }}
              </span>
            </div>
            <div class="header-row">
              <span class="label">Payment</span>
              <span class="badge" :class="statusClass(order.paymentStatus)">
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
                <p v-if="item.brandNameSnapshot" class="item-brand">{{ item.brandNameSnapshot }}</p>
                <p class="item-name">
                  <NuxtLink :to="`/products/${item.productSlugSnapshot}`" class="item-name-link">
                    {{ item.productNameSnapshot }}
                  </NuxtLink>
                </p>
                <p v-if="item.variantNameSnapshot" class="item-variant">{{ item.variantNameSnapshot }}</p>
                <div class="item-meta">
                  <span v-if="item.skuSnapshot">{{ item.skuSnapshot }}</span>
                  <span v-if="item.categoryNameSnapshot">{{ item.categoryNameSnapshot }}</span>
                  <span v-if="item.scaleSnapshot">{{ item.scaleSnapshot }}</span>
                </div>
              </div>
              <div class="item-pricing">
                <p class="item-unit">{{ formatCents(item.unitPriceCents) }} &times; {{ item.quantity }}</p>
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

          <!-- Shipping -->
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
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 32px;
  align-items: start;
}

.account-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.nav-item {
  display: block;
  padding: 12px 16px;
  font-size: 0.9rem;
  color: #555;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.1s;
}

.nav-item:hover {
  background: #f9fafb;
  color: #111;
}

.nav-item.active {
  background: #f3f4f6;
  color: #111;
  font-weight: 600;
}

.nav-logout {
  color: #b91c1c;
  border-top: 1px solid #e5e7eb;
}

.nav-logout:hover {
  background: #fef2f2;
  color: #991b1b;
}

.account-main {
  min-width: 0;
  max-width: 640px;
}

.back-link {
  display: inline-block;
  margin-bottom: 16px;
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link:hover {
  color: #111;
}

.form-error {
  font-size: 0.85rem;
  color: #b91c1c;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}

/* Order detail */
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
.badge.shipped { background: #dbeafe; color: #1e40af; }
.badge.delivered { background: #d1fae5; color: #065f46; }
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

.item-name-link {
  color: #111;
  text-decoration: none;
}

.item-name-link:hover {
  text-decoration: underline;
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

@media (max-width: 768px) {
  .account-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .account-sidebar {
    flex-direction: row;
    overflow-x: auto;
  }

  .nav-item {
    white-space: nowrap;
    padding: 10px 14px;
    font-size: 0.85rem;
  }

  .nav-logout {
    border-top: none;
    border-left: 1px solid #e5e7eb;
  }
}
</style>
