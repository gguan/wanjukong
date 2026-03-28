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
    await ElMessageBox.confirm('确认删除该分类吗？', '提示', { type: 'warning' });
    await api.del(`/api/admin/categories/${id}`);
    await load();
  } catch {}
}

onMounted(load);
</script>

<template>
  <div>
    <AdminPageHeader title="分类">
      <template #actions>
        <ElButton type="primary" @click="openCreate">+ 新建分类</ElButton>
      </template>
    </AdminPageHeader>

    <ElDialog v-model="dialogVisible" :title="editing ? '编辑分类' : '新建分类'" width="480px" destroy-on-close>
      <ElForm label-position="top" @submit.prevent="save">
        <ElFormItem label="名称">
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="URL 标识">
          <ElInput v-model="form.slug" placeholder="请输入 URL 标识" />
        </ElFormItem>
        <ElFormItem label="排序值">
          <ElInputNumber v-model="form.sortOrder" :min="0" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="save">保存</ElButton>
      </template>
    </ElDialog>

    <ElTable v-loading="loading" :data="categories" stripe>
      <ElTableColumn prop="name" label="名称" />
      <ElTableColumn prop="slug" label="URL 标识">
        <template #default="{ row }">
          <ElTag size="small" type="info" disable-transitions>{{ row.slug }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="sortOrder" label="排序" width="80" />
      <ElTableColumn label="操作" width="160" align="right">
        <template #default="{ row }">
          <ElButton size="small" @click="openEdit(row)">编辑</ElButton>
          <ElButton size="small" type="danger" @click="remove(row.id)">删除</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="暂无分类" />
      </template>
    </ElTable>
  </div>
</template>
