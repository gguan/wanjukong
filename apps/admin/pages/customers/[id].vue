<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const route = useRoute();
const api = useAdminApi();
const id = route.params.id as string;

interface CustomerAddress {
  id: string;
  label: string | null;
  fullName: string;
  phone: string | null;
  country: string;
  stateOrProvince: string | null;
  city: string;
  district: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface RecentOrder {
  id: string;
  orderNo: string;
  status: string;
  totalPriceCents: number;
  currency: string;
  createdAt: string;
}

interface Customer {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  wechatOpenId: string | null;
  authProvider: string;
  emailVerifiedAt: string | null;
  isActive: boolean;
  failedAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  addresses: CustomerAddress[];
  recentOrders: RecentOrder[];
  orderCount: number;
}

const customer = ref<Customer | null>(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    customer.value = await api.get<Customer>(`/api/admin/customers/${id}`);
  } finally {
    loading.value = false;
  }
}

function formatPrice(cents: number, currency: string) {
  const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function authProviderLabel(provider: string) {
  return provider === 'wechat' ? '微信' : '邮箱';
}

const isLocked = computed(() => {
  if (!customer.value?.lockedUntil) return false;
  return new Date(customer.value.lockedUntil).getTime() > Date.now();
});

onMounted(load);
</script>

<template>
  <div class="wk-admin-page">
    <div class="editor-header">
      <NuxtLink to="/customers" class="editor-header__back">&larr; 返回客户列表</NuxtLink>
    </div>

    <div v-if="loading" v-loading="true" style="min-height: 200px" />

    <template v-else-if="customer">
      <AdminPageHeader :title="customer.name || customer.email">
        <template #actions>
          <ElTag :type="customer.isActive ? 'success' : 'danger'" disable-transitions>
            {{ customer.isActive ? '启用' : '停用' }}
          </ElTag>
          <ElTag v-if="isLocked" type="warning" disable-transitions>
            账户锁定
          </ElTag>
        </template>
      </AdminPageHeader>

      <div class="product-editor">
        <!-- Main content -->
        <div class="product-editor__main">
          <!-- Basic info -->
          <AdminProductEditorSection title="基本信息" description="客户的账户信息">
            <div class="form-grid form-grid--2">
              <div>
                <div class="detail-label">邮箱</div>
                <div class="detail-value">{{ customer.email }}</div>
              </div>
              <div>
                <div class="detail-label">姓名</div>
                <div class="detail-value">{{ customer.name || '-' }}</div>
              </div>
              <div>
                <div class="detail-label">电话</div>
                <div class="detail-value">{{ customer.phone || '-' }}</div>
              </div>
              <div>
                <div class="detail-label">注册方式</div>
                <div class="detail-value">{{ authProviderLabel(customer.authProvider) }}</div>
              </div>
              <div>
                <div class="detail-label">邮箱验证</div>
                <div class="detail-value">
                  <span v-if="customer.emailVerifiedAt">已验证 · {{ formatDate(customer.emailVerifiedAt) }}</span>
                  <span v-else class="text-subdued">未验证</span>
                </div>
              </div>
              <div v-if="customer.wechatOpenId">
                <div class="detail-label">微信 OpenID</div>
                <div class="detail-value mono">{{ customer.wechatOpenId }}</div>
              </div>
            </div>
          </AdminProductEditorSection>

          <!-- Addresses -->
          <AdminProductEditorSection
            title="收货地址"
            :description="customer.addresses.length ? `${customer.addresses.length} 个地址` : '暂无地址'"
          >
            <div v-if="!customer.addresses.length" class="text-subdued text-sm" style="padding: 8px 0">
              客户尚未保存任何收货地址
            </div>
            <div v-else class="addresses-list">
              <div v-for="addr in customer.addresses" :key="addr.id" class="address-card">
                <div class="address-card__header">
                  <strong>{{ addr.fullName }}</strong>
                  <span v-if="addr.phone" class="address-card__phone">{{ addr.phone }}</span>
                  <ElTag v-if="addr.isDefault" size="small" type="success" disable-transitions>默认</ElTag>
                  <ElTag v-if="addr.label" size="small" disable-transitions>{{ addr.label }}</ElTag>
                </div>
                <div class="address-card__body">
                  <p>{{ addr.addressLine1 }}</p>
                  <p v-if="addr.addressLine2">{{ addr.addressLine2 }}</p>
                  <p>
                    <span v-if="addr.district">{{ addr.district }}, </span>
                    {{ addr.city }}
                    <span v-if="addr.stateOrProvince">, {{ addr.stateOrProvince }}</span>
                    <span v-if="addr.postalCode"> {{ addr.postalCode }}</span>
                  </p>
                  <p>{{ addr.country }}</p>
                </div>
              </div>
            </div>
          </AdminProductEditorSection>

          <!-- Recent orders -->
          <AdminProductEditorSection
            title="最近订单"
            :description="customer.orderCount ? `共 ${customer.orderCount} 单，显示最近 ${customer.recentOrders.length} 条` : '暂无订单'"
          >
            <div v-if="!customer.recentOrders.length" class="text-subdued text-sm" style="padding: 8px 0">
              客户还没有任何订单
            </div>
            <ElTable v-else :data="customer.recentOrders" size="small">
              <ElTableColumn label="订单号" min-width="160">
                <template #default="{ row }">
                  <NuxtLink :to="`/orders/${row.id}`" class="order-no-link">
                    {{ row.orderNo }}
                  </NuxtLink>
                </template>
              </ElTableColumn>
              <ElTableColumn label="状态" width="100" align="center">
                <template #default="{ row }">
                  <AdminStatusTag :value="row.status" />
                </template>
              </ElTableColumn>
              <ElTableColumn label="金额" width="120" align="right">
                <template #default="{ row }">
                  {{ formatPrice(row.totalPriceCents, row.currency) }}
                </template>
              </ElTableColumn>
              <ElTableColumn label="下单时间" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.createdAt) }}
                </template>
              </ElTableColumn>
            </ElTable>
          </AdminProductEditorSection>
        </div>

        <!-- Sidebar -->
        <aside class="product-editor__sidebar">
          <AdminSidebarCard title="账户状态">
            <div class="sidebar-info">
              <div class="info-row">
                <span class="info-label">状态</span>
                <span class="info-value">
                  <ElTag size="small" :type="customer.isActive ? 'success' : 'danger'" disable-transitions>
                    {{ customer.isActive ? '启用' : '停用' }}
                  </ElTag>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">登录失败次数</span>
                <span class="info-value">{{ customer.failedAttempts }}</span>
              </div>
              <div v-if="customer.lockedUntil" class="info-row">
                <span class="info-label">锁定至</span>
                <span class="info-value">{{ formatDate(customer.lockedUntil) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">最近登录</span>
                <span class="info-value">{{ formatDate(customer.lastLoginAt) }}</span>
              </div>
            </div>
          </AdminSidebarCard>

          <AdminSidebarCard title="账户信息">
            <div class="sidebar-info">
              <div class="info-row">
                <span class="info-label">客户 ID</span>
                <span class="info-value mono">{{ customer.id }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">注册时间</span>
                <span class="info-value">{{ formatDate(customer.createdAt) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">更新时间</span>
                <span class="info-value">{{ formatDate(customer.updatedAt) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">订单总数</span>
                <span class="info-value">{{ customer.orderCount }}</span>
              </div>
            </div>
          </AdminSidebarCard>
        </aside>
      </div>
    </template>

    <div v-else class="error-state">
      <ElEmpty description="客户不存在" />
    </div>
  </div>
</template>

<style scoped>
.detail-label { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 2px; }
.detail-value { font-size: 13px; color: var(--el-text-color-primary); word-break: break-all; }

.addresses-list { display: flex; flex-direction: column; gap: 12px; }

.address-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--el-fill-color-lighter);
}

.address-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
  font-size: 13px;
}

.address-card__phone {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.address-card__body p {
  margin: 0 0 2px;
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.5;
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

.sidebar-info { display: flex; flex-direction: column; gap: 10px; }
.info-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.info-label { font-size: 12px; color: var(--el-text-color-secondary); flex-shrink: 0; }
.info-value { font-size: 13px; color: var(--el-text-color-primary); text-align: right; word-break: break-all; }
.mono { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 12px; }
</style>
