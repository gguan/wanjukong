<script setup lang="ts">
definePageMeta({ middleware: 'account-auth' });

const { logout } = useStorefrontAuth();
const { listOrders } = useAccount();
const router = useRouter();

const orders = ref<any[]>([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    orders.value = await listOrders();
  } catch {
    error.value = 'Failed to load orders.';
  } finally {
    loading.value = false;
  }
});

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusClass(status: string) {
  return status.toLowerCase();
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
    UNPAID: 'Unpaid',
    PAID: 'Paid',
    FAILED: 'Failed',
    REFUNDED: 'Refunded',
  };
  return map[s] || s;
}

function viewOrder(orderNo: string) {
  router.push(`/orders/${orderNo}`);
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
        <h2 class="section-title">Order History</h2>

        <div v-if="loading" class="loading-state">Loading orders...</div>

        <div v-else-if="error" class="form-error">{{ error }}</div>

        <div v-else-if="orders.length === 0" class="empty-state">
          <p>No orders yet.</p>
          <NuxtLink to="/products" class="browse-link">Browse Products</NuxtLink>
        </div>

        <div v-else class="order-list">
          <div
            v-for="order in orders"
            :key="order.id"
            class="order-card"
            @click="viewOrder(order.orderNo)"
          >
            <div class="order-top">
              <div class="order-no">{{ order.orderNo }}</div>
              <div class="order-date">{{ formatDate(order.createdAt) }}</div>
            </div>
            <div class="order-middle">
              <span class="badge" :class="statusClass(order.status)">
                {{ statusLabel(order.status) }}
              </span>
              <span class="badge" :class="statusClass(order.paymentStatus)">
                {{ paymentLabel(order.paymentStatus) }}
              </span>
            </div>
            <div class="order-bottom">
              <span class="order-items-count">
                {{ order.items.length }} item{{ order.items.length !== 1 ? 's' : '' }}
              </span>
              <span class="order-total">{{ formatPrice(order.totalPriceCents) }}</span>
            </div>
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
}

.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 20px;
  color: #111;
}

.form-error {
  font-size: 0.85rem;
  color: #b91c1c;
  margin: 0;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}

.browse-link {
  display: inline-block;
  margin-top: 12px;
  padding: 10px 24px;
  background: #111;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
}

.browse-link:hover {
  background: #333;
}

/* Order List */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 20px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.order-card:hover {
  border-color: #c4c7cc;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.order-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.order-no {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  letter-spacing: -0.01em;
}

.order-date {
  font-size: 0.82rem;
  color: #888;
}

.order-middle {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.badge {
  font-size: 0.72rem;
  padding: 2px 8px;
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

.order-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-items-count {
  font-size: 0.82rem;
  color: #888;
}

.order-total {
  font-size: 0.95rem;
  font-weight: 700;
  color: #111;
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
