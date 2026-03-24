<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

const brands = ref<Brand[]>([]);
const loading = ref(true);

const showForm = ref(false);
const editing = ref<Brand | null>(null);
const form = ref({ name: '', slug: '', logo: '' });

async function load() {
  loading.value = true;
  brands.value = await api.get('/api/admin/brands');
  loading.value = false;
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', slug: '', logo: '' };
  showForm.value = true;
}

function openEdit(b: Brand) {
  editing.value = b;
  form.value = { name: b.name, slug: b.slug, logo: b.logo || '' };
  showForm.value = true;
}

async function save() {
  if (editing.value) {
    await api.put(`/api/admin/brands/${editing.value.id}`, form.value);
  } else {
    await api.post('/api/admin/brands', form.value);
  }
  showForm.value = false;
  await load();
}

async function remove(id: string) {
  if (!confirm('Delete this brand?')) return;
  await api.del(`/api/admin/brands/${id}`);
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Brands</h2>
      <button class="btn" @click="openCreate">+ New Brand</button>
    </div>

    <div v-if="showForm" class="form-card">
      <h3>{{ editing ? 'Edit Brand' : 'New Brand' }}</h3>
      <form @submit.prevent="save">
        <label>Name <input v-model="form.name" required /></label>
        <label>Slug <input v-model="form.slug" required /></label>
        <label>Logo URL <input v-model="form.logo" /></label>
        <div class="form-actions">
          <button type="submit" class="btn">Save</button>
          <button type="button" class="btn btn--secondary" @click="showForm = false">Cancel</button>
        </div>
      </form>
    </div>

    <table v-if="!loading && brands.length" class="data-table">
      <thead>
        <tr><th>Name</th><th>Slug</th><th>Actions</th></tr>
      </thead>
      <tbody>
        <tr v-for="b in brands" :key="b.id">
          <td>{{ b.name }}</td>
          <td><code>{{ b.slug }}</code></td>
          <td class="actions">
            <button class="btn-sm" @click="openEdit(b)">Edit</button>
            <button class="btn-sm btn-sm--danger" @click="remove(b.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="!loading && !brands.length" class="empty">No brands yet.</p>
    <p v-if="loading" class="empty">Loading...</p>
  </div>
</template>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
h2 { margin: 0; }
.form-card { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin-bottom: 20px; max-width: 500px; }
.form-card h3 { margin: 0 0 16px; }
.form-card label { display: block; margin-bottom: 12px; font-size: 0.875rem; color: #555; }
.form-card input { display: block; width: 100%; margin-top: 4px; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem; box-sizing: border-box; }
.form-actions { display: flex; gap: 8px; margin-top: 16px; }
.btn { padding: 8px 16px; background: #1a1a2e; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; }
.btn:hover { background: #2d2d4e; }
.btn--secondary { background: #888; }
.btn--secondary:hover { background: #666; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #eee; }
.data-table th { background: #f5f5f5; font-size: 0.8rem; text-transform: uppercase; color: #888; }
.actions { display: flex; gap: 6px; }
.btn-sm { padding: 4px 10px; font-size: 0.8rem; border: 1px solid #ccc; background: #fff; border-radius: 3px; cursor: pointer; }
.btn-sm:hover { background: #f0f0f0; }
.btn-sm--danger { color: #b91c1c; border-color: #fca5a5; }
.btn-sm--danger:hover { background: #fef2f2; }
code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.85rem; }
.empty { color: #999; }
</style>
