<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();

interface Product {
  id: string;
  name: string;
  slug: string;
  status: string;
  saleType: string;
  brand: { name: string };
  category: { name: string };
}

// Search / filter state
const search = ref('');
const statusFilter = ref('');
const page = ref(1);
const limit = 20;

const loading = ref(false);
const products = ref<Product[]>([]);
const total = ref(0);

const totalPages = computed(() => Math.ceil(total.value / limit) || 1);

async function load() {
  loading.value = true;
  const params = new URLSearchParams();
  if (search.value) params.set('search', search.value);
  if (statusFilter.value) params.set('status', statusFilter.value);
  params.set('page', String(page.value));
  params.set('limit', String(limit));
  const qs = params.toString();
  const result = await api.get(`/api/admin/products?${qs}`) as { data?: Product[]; total?: number } | Product[];
  const paginated = result as { data?: Product[]; total?: number };
  products.value = paginated.data ?? (result as Product[]);
  total.value = paginated.total ?? products.value.length;
  loading.value = false;
}

function onSearch() {
  page.value = 1;
  load();
}

function goToPage(p: number) {
  page.value = p;
  load();
}

async function remove(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该商品吗？', '提示', { type: 'warning' });
    await api.del(`/api/admin/products/${id}`);
    await load();
  } catch {}
}

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: 'DRAFT' },
  { label: '上架', value: 'ACTIVE' },
  { label: '下架', value: 'INACTIVE' },
];

onMounted(load);
</script>

<template>
  <div>
    <AdminPageHeader title="商品">
      <template #actions>
        <NuxtLink to="/products/create">
          <ElButton type="primary">+ 新建商品</ElButton>
        </NuxtLink>
      </template>
    </AdminPageHeader>

    <!-- Filters -->
    <div class="filters">
      <ElInput
        v-model="search"
        placeholder="搜索商品名称..."
        clearable
        style="width: 240px"
        @keyup.enter="onSearch"
        @clear="onSearch"
      >
        <template #prefix>
          <ElIcon><Search /></ElIcon>
        </template>
      </ElInput>

      <ElSelect v-model="statusFilter" style="width: 160px" @change="onSearch">
        <ElOption
          v-for="opt in statusOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </ElSelect>

      <ElButton @click="onSearch">查询</ElButton>
    </div>

    <ElTable v-loading="loading" :data="products" stripe>
      <ElTableColumn prop="name" label="名称" min-width="200" />
      <ElTableColumn label="品牌" width="140">
        <template #default="{ row }">{{ row.brand?.name }}</template>
      </ElTableColumn>
      <ElTableColumn label="分类" width="140">
        <template #default="{ row }">{{ row.category?.name }}</template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="100">
        <template #default="{ row }">
          <AdminStatusTag :value="row.status" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="销售类型" width="120">
        <template #default="{ row }">
          <AdminStatusTag :value="row.saleType" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="160" align="right">
        <template #default="{ row }">
          <NuxtLink :to="`/products/${row.id}`">
            <ElButton size="small">编辑</ElButton>
          </NuxtLink>
          <ElButton size="small" type="danger" @click="remove(row.id)">删除</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="暂无商品" />
      </template>
    </ElTable>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <ElPagination
        :current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="goToPage"
      />
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
