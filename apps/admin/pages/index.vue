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
  PENDING: '待处理', CONFIRMED: '已确认', SHIPPED: '已发货', DELIVERED: '已签收', CANCELLED: '已取消',
};
const payStatusLabel: Record<string, string> = {
  UNPAID: '未付款', PAID: '已付款', FAILED: '失败', REFUNDED: '已退款',
};

onMounted(loadDashboard);
</script>

<template>
  <div>
    <div class="page-header">
      <h2 class="page-header__title">总览</h2>
      <p class="page-header__subtitle">欢迎使用 wanjukong 管理后台</p>
    </div>

    <div v-if="loading" class="text-subdued">加载中...</div>
    <div v-else-if="error" class="text-critical">{{ error }}</div>

    <template v-else-if="stats">
      <!-- Stats cards -->
      <div class="wk-stats-grid">
        <div class="wk-stat-card">
          <p class="wk-stat-card__label">总订单</p>
          <p class="wk-stat-card__value">{{ stats.totalOrders }}</p>
        </div>
        <div class="wk-stat-card">
          <p class="wk-stat-card__label">总收入（已付款）</p>
          <p class="wk-stat-card__value">{{ fmt(stats.totalRevenueCents) }}</p>
        </div>
        <div class="wk-stat-card">
          <p class="wk-stat-card__label">待处理</p>
          <p class="wk-stat-card__value">{{ stats.byStatus['PENDING'] || 0 }}</p>
        </div>
        <div class="wk-stat-card">
          <p class="wk-stat-card__label">已付款</p>
          <p class="wk-stat-card__value wk-stat-card__value--success">{{ stats.byPaymentStatus['PAID'] || 0 }}</p>
        </div>
        <div class="wk-stat-card">
          <p class="wk-stat-card__label">未付款</p>
          <p class="wk-stat-card__value wk-stat-card__value--warn">{{ stats.byPaymentStatus['UNPAID'] || 0 }}</p>
        </div>
        <div class="wk-stat-card">
          <p class="wk-stat-card__label">已确认</p>
          <p class="wk-stat-card__value">{{ stats.byStatus['CONFIRMED'] || 0 }}</p>
        </div>
      </div>

      <div class="wk-panels">
        <!-- Recent orders -->
        <div class="wk-card">
          <div class="wk-card__header">
            <h3>最近订单</h3>
            <NuxtLink to="/orders" class="wk-link--subdued">查看全部 →</NuxtLink>
          </div>
          <div class="wk-card__body">
            <div v-if="!stats.recentOrders.length" class="text-subdued text-sm">暂无订单</div>
            <table v-else class="wk-mini-table">
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
                    <NuxtLink :to="`/orders/${order.id}`" class="wk-link">{{ order.orderNo }}</NuxtLink>
                  </td>
                  <td>{{ order.fullName }}</td>
                  <td>
                    <span class="wk-badge" :class="`wk-badge--${order.status.toLowerCase()}`">
                      {{ statusLabel[order.status] || order.status }}
                    </span>
                  </td>
                  <td>{{ fmt(order.totalPriceCents) }}</td>
                  <td class="text-subdued text-sm">{{ fmtDate(order.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Low stock alerts -->
        <div class="wk-card">
          <div class="wk-card__header">
            <h3>
              库存预警
              <span class="wk-badge wk-badge--low">库存 ≤ 5</span>
            </h3>
          </div>
          <div class="wk-card__body">
            <div v-if="!stats.lowStockVariants.length" class="text-success text-sm">✓ 无库存预警</div>
            <table v-else class="wk-mini-table">
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
                    <span class="text-subdued text-sm">{{ v.product.brand?.name }}</span><br />
                    {{ v.product.name }}
                  </td>
                  <td>{{ v.name }}</td>
                  <td class="text-subdued text-sm">{{ v.sku }}</td>
                  <td>
                    <span class="wk-badge" :class="v.stock <= 2 ? 'wk-badge--critical' : 'wk-badge--low'">
                      {{ v.stock }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 24px;
}
.page-header__title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.page-header__subtitle {
  color: var(--el-text-color-regular);
  margin: 0;
  font-size: 13px;
}
</style>
