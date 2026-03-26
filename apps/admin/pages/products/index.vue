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
    await ElMessageBox.confirm('Delete this product?', 'Confirm', { type: 'warning' });
    await api.del(`/api/admin/products/${id}`);
    await load();
  } catch {}
}

onMounted(load);
</script>

<template>
  <div>
    <AdminPageHeader title="Products">
      <template #actions>
        <NuxtLink to="/products/create">
          <ElButton type="primary">+ New Product</ElButton>
        </NuxtLink>
      </template>
    </AdminPageHeader>

    <ElTable v-loading="loading" :data="products" stripe>
      <ElTableColumn prop="name" label="Name" min-width="200" />
      <ElTableColumn label="Brand" width="140">
        <template #default="{ row }">{{ row.brand?.name }}</template>
      </ElTableColumn>
      <ElTableColumn label="Category" width="140">
        <template #default="{ row }">{{ row.category?.name }}</template>
      </ElTableColumn>
      <ElTableColumn label="Status" width="100">
        <template #default="{ row }">
          <AdminStatusTag :value="row.status" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="Sale Type" width="120">
        <template #default="{ row }">
          <AdminStatusTag :value="row.saleType" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="Actions" width="160" align="right">
        <template #default="{ row }">
          <NuxtLink :to="`/products/${row.id}`">
            <ElButton size="small">Edit</ElButton>
          </NuxtLink>
          <ElButton size="small" type="danger" @click="remove(row.id)">Delete</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="No products yet" />
      </template>
    </ElTable>
  </div>
</template>
