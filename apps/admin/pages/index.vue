<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();

interface DashboardStats {
  totalOrders: number;
  totalRevenueCents: number;
  byStatus: Record<string, number>;
  byPaymentStatus: Record<string, number>;
  lowStockVariants: Array<{
    id: string;
    name: string;
    sku: string;
    stock: number;
    product: {
      id: string;
      name: string;
      brand: { name: string };
    };
  }>;
  recentOrders: Array<{
    id: string;
    orderNo: string;
    fullName: string;
    status: string;
    paymentStatus: string;
    totalPriceCents: number;
    createdAt: string;
  }>;
}

const stats = ref<DashboardStats | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

async function loadDashboard() {
  loading.value = true;
  error.value = null;
  try {
    stats.value = await api.get('/api/admin/orders/dashboard');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const statusLabel: Record<string, string> = {
  PENDING: '待处理', CONFIRMED: '已确认', CANCELLED: '已取消',
};
const payStatusLabel: Record<string, string> = {
  UNPAID: '未付款', PAID: '已付款', FAILED: '失败', REFUNDED: '已退款',
};

onMounted(loadDashboard);
</script>

<template>
  <div>
    <h2 class="dashboard-title">总览</h2>
    <p class="dashboard-sub">欢迎使用 wanjukong 管理后台</p>

    <div v-if="loading" class="loading-msg">加载中...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <template v-else-if="stats">
      <!-- Stats cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <p class="stat-label">总订单</p>
          <p class="stat-value">{{ stats.totalOrders }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">总收入（已付款）</p>
          <p class="stat-value">{{ fmt(stats.totalRevenueCents) }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">待处理</p>
          <p class="stat-value">{{ stats.byStatus['PENDING'] || 0 }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">已付款</p>
          <p class="stat-value">{{ stats.byPaymentStatus['PAID'] || 0 }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">未付款</p>
          <p class="stat-value warn">{{ stats.byPaymentStatus['UNPAID'] || 0 }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">已确认</p>
          <p class="stat-value">{{ stats.byStatus['CONFIRMED'] || 0 }}</p>
        </div>
      </div>

      <div class="panels">
        <!-- Recent orders -->
        <div class="panel">
          <div class="panel-header">
            <h3>最近订单</h3>
            <NuxtLink to="/orders" class="panel-link">查看全部 →</NuxtLink>
          </div>
          <div v-if="!stats.recentOrders.length" class="panel-empty">暂无订单</div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>客户</th>
                <th>状态</th>
                <th>金额</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in stats.recentOrders" :key="order.id">
                <td>
                  <NuxtLink :to="`/orders/${order.id}`" class="order-link">{{ order.orderNo }}</NuxtLink>
                </td>
                <td>{{ order.fullName }}</td>
                <td>
                  <span class="tag" :class="order.status.toLowerCase()">
                    {{ statusLabel[order.status] || order.status }}
                  </span>
                </td>
                <td>{{ fmt(order.totalPriceCents) }}</td>
                <td class="muted">{{ fmtDate(order.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Low stock alerts -->
        <div class="panel">
          <div class="panel-header">
            <h3>库存预警 <span class="warn-badge">库存 ≤ 5</span></h3>
          </div>
          <div v-if="!stats.lowStockVariants.length" class="panel-empty panel-ok">✓ 无库存预警</div>
          <table v-else class="mini-table">
            <thead>
              <tr>
                <th>商品</th>
                <th>变体</th>
                <th>SKU</th>
                <th>剩余库存</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in stats.lowStockVariants" :key="v.id">
                <td>
                  <span class="muted small">{{ v.product.brand?.name }}</span><br />
                  {{ v.product.name }}
                </td>
                <td>{{ v.name }}</td>
                <td class="muted small">{{ v.sku }}</td>
                <td>
                  <span class="stock-badge" :class="v.stock <= 2 ? 'critical' : 'low'">
                    {{ v.stock }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard-title { margin: 0 0 4px; font-size: 1.25rem; }
.dashboard-sub { color: #666; margin: 0 0 24px; font-size: 0.9rem; }
.loading-msg { color: #888; }
.error-msg { color: #dc2626; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 20px;
}
.stat-label {
  font-size: 0.75rem;
  color: #888;
  margin: 0 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  color: #111;
}
.stat-value.warn { color: #d97706; }

.panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 900px) {
  .panels { grid-template-columns: 1fr; }
}

.panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.panel-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-link {
  font-size: 0.8rem;
  color: #666;
  text-decoration: none;
}
.panel-link:hover { color: #111; }
.panel-empty { color: #aaa; font-size: 0.875rem; }
.panel-ok { color: #16a34a; }

.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.mini-table th {
  text-align: left;
  padding: 6px 8px;
  color: #888;
  font-weight: 500;
  border-bottom: 1px solid #f3f4f6;
}
.mini-table td {
  padding: 8px 8px;
  border-bottom: 1px solid #f9fafb;
  color: #333;
  vertical-align: middle;
}
.mini-table tr:last-child td { border-bottom: none; }

.order-link { color: #111; text-decoration: none; font-weight: 500; }
.order-link:hover { text-decoration: underline; }

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}
.tag.pending { background: #fef3c7; color: #92400e; }
.tag.confirmed { background: #d1fae5; color: #065f46; }
.tag.cancelled { background: #fee2e2; color: #991b1b; }

.muted { color: #888; }
.small { font-size: 0.78rem; }

.warn-badge {
  background: #fef3c7;
  color: #92400e;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.stock-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.85rem;
}
.stock-badge.low { background: #fef3c7; color: #92400e; }
.stock-badge.critical { background: #fee2e2; color: #991b1b; }
</style>
