<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();

interface OrderItem {
  id: string;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  quantity: number;
  totalPriceCents: number;
}

interface Order {
  id: string;
  orderNo: string;
  status: string;
  paymentStatus: string;
  fullName: string;
  email: string;
  currency: string;
  totalPriceCents: number;
  createdAt: string;
  items: OrderItem[];
}

interface OrdersResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}

interface OrderStats {
  total: number;
  byStatus: Record<string, number>;
  byPaymentStatus: Record<string, number>;
}

const orders = ref<Order[]>([]);
const loading = ref(true);
const total = ref(0);
const page = ref(1);
const limit = ref(20);
const search = ref('');
const statusFilter = ref('');
const paymentStatusFilter = ref('');
const stats = ref<OrderStats | null>(null);

async function load() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set('page', String(page.value));
    params.set('limit', String(limit.value));
    if (search.value) params.set('search', search.value);
    if (statusFilter.value) params.set('status', statusFilter.value);
    if (paymentStatusFilter.value) params.set('paymentStatus', paymentStatusFilter.value);

    const res = await api.get<OrdersResponse>(`/api/admin/orders?${params.toString()}`);
    orders.value = res.data;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    stats.value = await api.get<OrderStats>('/api/admin/orders/stats');
  } catch {
    // silent
  }
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function handleSearch() {
  page.value = 1;
  load();
}

function handlePageChange(p: number) {
  page.value = p;
  load();
}

function handleFilterChange() {
  page.value = 1;
  load();
}

onMounted(() => {
  load();
  loadStats();
});
</script>

<template>
  <div class="wk-admin-page">
    <AdminPageHeader title="订单">
      <template #actions>
        <span v-if="stats" class="stats-summary">
          共 {{ stats.total }} 单
        </span>
      </template>
    </AdminPageHeader>

    <!-- Stats cards -->
    <div v-if="stats" class="stats-cards">
      <div class="stat-card">
        <div class="stat-value">{{ stats.byStatus?.PENDING || 0 }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.byStatus?.CONFIRMED || 0 }}</div>
        <div class="stat-label">已确认</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.byPaymentStatus?.PAID || 0 }}</div>
        <div class="stat-label">已付款</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.byPaymentStatus?.UNPAID || 0 }}</div>
        <div class="stat-label">未付款</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <ElInput
        v-model="search"
        placeholder="搜索订单号、客户名或邮箱"
        clearable
        style="max-width: 300px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #prefix>
          <ElIcon><i class="el-icon-search" /></ElIcon>
        </template>
      </ElInput>

      <ElSelect
        v-model="statusFilter"
        placeholder="订单状态"
        clearable
        style="width: 140px"
        @change="handleFilterChange"
      >
        <ElOption label="待处理" value="PENDING" />
        <ElOption label="已确认" value="CONFIRMED" />
        <ElOption label="已取消" value="CANCELLED" />
      </ElSelect>

      <ElSelect
        v-model="paymentStatusFilter"
        placeholder="付款状态"
        clearable
        style="width: 140px"
        @change="handleFilterChange"
      >
        <ElOption label="未付款" value="UNPAID" />
        <ElOption label="已付款" value="PAID" />
        <ElOption label="付款失败" value="FAILED" />
        <ElOption label="已退款" value="REFUNDED" />
      </ElSelect>

      <ElButton @click="handleSearch">搜索</ElButton>
    </div>

    <!-- Table -->
    <ElTable v-loading="loading" :data="orders" stripe>
      <ElTableColumn label="订单号" min-width="180">
        <template #default="{ row }">
          <NuxtLink :to="`/orders/${row.id}`" class="order-no-link">
            {{ row.orderNo }}
          </NuxtLink>
        </template>
      </ElTableColumn>

      <ElTableColumn prop="fullName" label="客户" min-width="120" />

      <ElTableColumn prop="email" label="邮箱" min-width="180" show-overflow-tooltip />

      <ElTableColumn label="状态" width="100" align="center">
        <template #default="{ row }">
          <AdminStatusTag :value="row.status" />
        </template>
      </ElTableColumn>

      <ElTableColumn label="付款" width="100" align="center">
        <template #default="{ row }">
          <AdminStatusTag :value="row.paymentStatus" />
        </template>
      </ElTableColumn>

      <ElTableColumn label="商品数" width="80" align="center">
        <template #default="{ row }">
          {{ row.items.length }}
        </template>
      </ElTableColumn>

      <ElTableColumn label="金额" width="110" align="right">
        <template #default="{ row }">
          {{ formatPrice(row.totalPriceCents) }}
        </template>
      </ElTableColumn>

      <ElTableColumn label="日期" width="160">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </ElTableColumn>

      <ElTableColumn label="操作" width="80" align="right">
        <template #default="{ row }">
          <NuxtLink :to="`/orders/${row.id}`">
            <ElButton type="primary" text size="small">查看</ElButton>
          </NuxtLink>
        </template>
      </ElTableColumn>

      <template #empty>
        <ElEmpty description="暂无订单" />
      </template>
    </ElTable>

    <!-- Pagination -->
    <div v-if="total > limit" class="pagination-bar">
      <ElPagination
        :current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.stats-summary {
  font-size: 0.85rem;
  color: #888;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--wk-admin-panel-bg, #fff);
  border: 1px solid var(--wk-admin-border, #e3e3e3);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111;
}

.stat-label {
  font-size: 0.8rem;
  color: #888;
  margin-top: 4px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.order-no-link {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.85rem;
  color: var(--el-color-primary);
  text-decoration: none;
}

.order-no-link:hover {
  text-decoration: underline;
}

.pagination-bar {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
