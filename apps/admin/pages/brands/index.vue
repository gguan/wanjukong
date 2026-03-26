<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();

interface Brand {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  logo: string | null;
}

const brands = ref<Brand[]>([]);
const loading = ref(true);

const dialogVisible = ref(false);
const editing = ref<Brand | null>(null);
const form = ref({ name: '', slug: '', code: '', logo: '' });

async function load() {
  loading.value = true;
  brands.value = await api.get('/api/admin/brands');
  loading.value = false;
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', slug: '', code: '', logo: '' };
  dialogVisible.value = true;
}

function openEdit(b: Brand) {
  editing.value = b;
  form.value = { name: b.name, slug: b.slug, code: b.code || '', logo: b.logo || '' };
  dialogVisible.value = true;
}

async function save() {
  if (editing.value) {
    await api.put(`/api/admin/brands/${editing.value.id}`, form.value);
  } else {
    await api.post('/api/admin/brands', form.value);
  }
  dialogVisible.value = false;
  await load();
}

async function remove(id: string) {
  try {
    await ElMessageBox.confirm('Delete this brand?', 'Confirm', { type: 'warning' });
    await api.del(`/api/admin/brands/${id}`);
    await load();
  } catch {}
}

onMounted(load);
</script>

<template>
  <div>
    <AdminPageHeader title="Brands">
      <template #actions>
        <ElButton type="primary" @click="openCreate">+ New Brand</ElButton>
      </template>
    </AdminPageHeader>

    <ElDialog v-model="dialogVisible" :title="editing ? 'Edit Brand' : 'New Brand'" width="480px" destroy-on-close>
      <ElForm label-position="top" @submit.prevent="save">
        <ElFormItem label="Name">
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="Slug">
          <ElInput v-model="form.slug" />
        </ElFormItem>
        <ElFormItem label="Code">
          <ElInput v-model="form.code" placeholder="e.g. HT, DAM, TZ" />
        </ElFormItem>
        <ElFormItem label="Logo URL">
          <ElInput v-model="form.logo" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">Cancel</ElButton>
        <ElButton type="primary" @click="save">Save</ElButton>
      </template>
    </ElDialog>

    <ElTable v-loading="loading" :data="brands" stripe>
      <ElTableColumn prop="name" label="Name" />
      <ElTableColumn prop="slug" label="Slug">
        <template #default="{ row }">
          <ElTag size="small" type="info" disable-transitions>{{ row.slug }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="code" label="Code" width="100" />
      <ElTableColumn label="Actions" width="160" align="right">
        <template #default="{ row }">
          <ElButton size="small" @click="openEdit(row)">Edit</ElButton>
          <ElButton size="small" type="danger" @click="remove(row.id)">Delete</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="No brands yet" />
      </template>
    </ElTable>
  </div>
</template>
