<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();

interface Customer {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  authProvider: string;
  locale: string;
  emailVerifiedAt: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  orderCount: number;
}

interface CustomersResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
}

const customers = ref<Customer[]>([]);
const loading = ref(true);
const total = ref(0);
const page = ref(1);
const limit = ref(20);
const search = ref('');
const authProviderFilter = ref('');

async function load() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set('page', String(page.value));
    params.set('limit', String(limit.value));
    if (search.value) params.set('search', search.value);
    if (authProviderFilter.value) params.set('authProvider', authProviderFilter.value);

    const res = await api.get<CustomersResponse>(`/api/admin/customers?${params.toString()}`);
    customers.value = res.data;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
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

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  ja: '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
};

function localeLabel(code: string) {
  return LOCALE_LABELS[code] || code;
}

function handleSearch() {
  page.value = 1;
  load();
}

function handleFilterChange() {
  page.value = 1;
  load();
}

function handlePageChange(p: number) {
  page.value = p;
  load();
}

onMounted(load);
</script>

<template>
  <div class="wk-admin-page">
    <AdminPageHeader title="客户">
      <template #actions>
        <span class="stats-summary">共 {{ total }} 位客户</span>
      </template>
    </AdminPageHeader>

    <div class="filter-bar">
      <ElInput
        v-model="search"
        placeholder="搜索邮箱、姓名或电话"
        clearable
        style="max-width: 320px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <ElSelect
        v-model="authProviderFilter"
        placeholder="注册方式"
        clearable
        style="width: 140px"
        @change="handleFilterChange"
      >
        <ElOption label="邮箱注册" value="email" />
        <ElOption label="微信小程序" value="wechat" />
      </ElSelect>
      <ElButton @click="handleSearch">搜索</ElButton>
    </div>

    <ElTable v-loading="loading" :data="customers" stripe>
      <ElTableColumn label="邮箱" min-width="200">
        <template #default="{ row }">
          <NuxtLink :to="`/customers/${row.id}`" class="customer-link">
            {{ row.email }}
          </NuxtLink>
        </template>
      </ElTableColumn>

      <ElTableColumn label="姓名" min-width="120">
        <template #default="{ row }">
          {{ row.name || '-' }}
        </template>
      </ElTableColumn>

      <ElTableColumn label="电话" min-width="140">
        <template #default="{ row }">
          {{ row.phone || '-' }}
        </template>
      </ElTableColumn>

      <ElTableColumn label="注册方式" width="100" align="center">
        <template #default="{ row }">
          <ElTag size="small" :type="row.authProvider === 'wechat' ? 'success' : 'info'" disable-transitions>
            {{ authProviderLabel(row.authProvider) }}
          </ElTag>
        </template>
      </ElTableColumn>

      <ElTableColumn label="语言" width="100" align="center">
        <template #default="{ row }">
          {{ localeLabel(row.locale) }}
        </template>
      </ElTableColumn>

      <ElTableColumn label="邮箱验证" width="100" align="center">
        <template #default="{ row }">
          <ElTag
            size="small"
            :type="row.emailVerifiedAt ? 'success' : 'warning'"
            disable-transitions
          >
            {{ row.emailVerifiedAt ? '已验证' : '未验证' }}
          </ElTag>
        </template>
      </ElTableColumn>

      <ElTableColumn label="状态" width="80" align="center">
        <template #default="{ row }">
          <ElTag :type="row.isActive ? 'success' : 'danger'" size="small" disable-transitions>
            {{ row.isActive ? '启用' : '停用' }}
          </ElTag>
        </template>
      </ElTableColumn>

      <ElTableColumn label="订单数" width="80" align="center">
        <template #default="{ row }">
          {{ row.orderCount }}
        </template>
      </ElTableColumn>

      <ElTableColumn label="最近登录" width="160">
        <template #default="{ row }">
          {{ formatDate(row.lastLoginAt) }}
        </template>
      </ElTableColumn>

      <ElTableColumn label="注册时间" width="160">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </ElTableColumn>

      <ElTableColumn label="操作" width="80" align="right">
        <template #default="{ row }">
          <NuxtLink :to="`/customers/${row.id}`">
            <ElButton type="primary" text size="small">查看</ElButton>
          </NuxtLink>
        </template>
      </ElTableColumn>

      <template #empty>
        <ElEmpty description="暂无客户" />
      </template>
    </ElTable>

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

.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.customer-link {
  color: var(--el-color-primary);
  text-decoration: none;
}

.customer-link:hover {
  text-decoration: underline;
}

.pagination-bar {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
