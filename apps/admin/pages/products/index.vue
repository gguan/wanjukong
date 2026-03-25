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
  if (!confirm('Delete this product?')) return;
  await api.del(`/api/admin/products/${id}`);
  await load();
}

onMounted(load);

function statusClass(s: string) {
  return {
    ACTIVE: 'badge--green',
    DRAFT: 'badge--gray',
    INACTIVE: 'badge--yellow',
  }[s] || '';
}

function saleTypeClass(a: string) {
  return {
    IN_STOCK: 'badge--green',
    PREORDER: 'badge--blue',
  }[a] || '';
}

function saleTypeLabel(a: string) {
  return {
    IN_STOCK: 'In Stock',
    PREORDER: 'Preorder',
  }[a] || a;
}
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Products</h2>
      <NuxtLink to="/products/create" class="btn">+ New Product</NuxtLink>
    </div>

    <table v-if="!loading && products.length" class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Brand</th>
          <th>Category</th>
          <th>Status</th>
          <th>Sale Type</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in products" :key="p.id">
          <td>{{ p.name }}</td>
          <td>{{ p.brand.name }}</td>
          <td>{{ p.category.name }}</td>
          <td><span class="badge" :class="statusClass(p.status)">{{ p.status }}</span></td>
          <td><span class="badge" :class="saleTypeClass(p.saleType)">{{ saleTypeLabel(p.saleType) }}</span></td>
          <td class="actions">
            <NuxtLink :to="`/products/${p.id}`" class="btn-sm">Edit</NuxtLink>
            <button class="btn-sm btn-sm--danger" @click="remove(p.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="!loading && !products.length" class="empty">No products yet.</p>
    <p v-if="loading" class="empty">Loading...</p>
  </div>
</template>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
h2 { margin: 0; }
.btn { display: inline-block; padding: 8px 16px; background: #1a1a2e; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; text-decoration: none; }
.btn:hover { background: #2d2d4e; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #eee; }
.data-table th { background: #f5f5f5; font-size: 0.8rem; text-transform: uppercase; color: #888; }
.actions { display: flex; gap: 6px; }
.btn-sm { display: inline-block; padding: 4px 10px; font-size: 0.8rem; border: 1px solid #ccc; background: #fff; border-radius: 3px; cursor: pointer; text-decoration: none; color: #333; }
.btn-sm:hover { background: #f0f0f0; }
.btn-sm--danger { color: #b91c1c; border-color: #fca5a5; }
.btn-sm--danger:hover { background: #fef2f2; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 500; }
.badge--green { background: #dcfce7; color: #166534; }
.badge--gray { background: #f3f4f6; color: #6b7280; }
.badge--yellow { background: #fef9c3; color: #854d0e; }
.badge--blue { background: #dbeafe; color: #1e40af; }
.empty { color: #999; }
</style>
