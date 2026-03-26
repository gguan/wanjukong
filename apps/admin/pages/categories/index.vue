<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

const categories = ref<Category[]>([]);
const loading = ref(true);

const dialogVisible = ref(false);
const editing = ref<Category | null>(null);
const form = ref({ name: '', slug: '', sortOrder: 0 });

async function load() {
  loading.value = true;
  categories.value = await api.get('/api/admin/categories');
  loading.value = false;
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', slug: '', sortOrder: 0 };
  dialogVisible.value = true;
}

function openEdit(c: Category) {
  editing.value = c;
  form.value = { name: c.name, slug: c.slug, sortOrder: c.sortOrder };
  dialogVisible.value = true;
}

async function save() {
  const payload = { ...form.value, sortOrder: Number(form.value.sortOrder) };
  if (editing.value) {
    await api.put(`/api/admin/categories/${editing.value.id}`, payload);
  } else {
    await api.post('/api/admin/categories', payload);
  }
  dialogVisible.value = false;
  await load();
}

async function remove(id: string) {
  try {
    await ElMessageBox.confirm('Delete this category?', 'Confirm', { type: 'warning' });
    await api.del(`/api/admin/categories/${id}`);
    await load();
  } catch {}
}

onMounted(load);
</script>

<template>
  <div>
    <AdminPageHeader title="Categories">
      <template #actions>
        <ElButton type="primary" @click="openCreate">+ New Category</ElButton>
      </template>
    </AdminPageHeader>

    <ElDialog v-model="dialogVisible" :title="editing ? 'Edit Category' : 'New Category'" width="480px" destroy-on-close>
      <ElForm label-position="top" @submit.prevent="save">
        <ElFormItem label="Name">
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="Slug">
          <ElInput v-model="form.slug" />
        </ElFormItem>
        <ElFormItem label="Sort Order">
          <ElInputNumber v-model="form.sortOrder" :min="0" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">Cancel</ElButton>
        <ElButton type="primary" @click="save">Save</ElButton>
      </template>
    </ElDialog>

    <ElTable v-loading="loading" :data="categories" stripe>
      <ElTableColumn prop="name" label="Name" />
      <ElTableColumn prop="slug" label="Slug">
        <template #default="{ row }">
          <ElTag size="small" type="info" disable-transitions>{{ row.slug }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="sortOrder" label="Sort" width="80" />
      <ElTableColumn label="Actions" width="160" align="right">
        <template #default="{ row }">
          <ElButton size="small" @click="openEdit(row)">Edit</ElButton>
          <ElButton size="small" type="danger" @click="remove(row.id)">Delete</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="No categories yet" />
      </template>
    </ElTable>
  </div>
</template>
