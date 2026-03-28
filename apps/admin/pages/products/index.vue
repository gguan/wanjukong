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

const products = ref<Product[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  products.value = await api.get('/api/admin/products');
  loading.value = false;
}

async function remove(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该商品吗？', '提示', { type: 'warning' });
    await api.del(`/api/admin/products/${id}`);
    await load();
  } catch {}
}

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
  </div>
</template>
