<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();
const store = useAdminAuthStore();

interface BrandOption {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  brandAssignments?: Array<{
    brandId: string;
    brand: BrandOption;
  }>;
}

const users = ref<AdminUser[]>([]);
const brands = ref<BrandOption[]>([]);
const loading = ref(true);

// Create dialog
const createDialogVisible = ref(false);
const createForm = ref({ email: '', password: '', name: '', role: 'EDITOR' });

// Brand assignment dialog
const assignDialogVisible = ref(false);
const assignUser = ref<AdminUser | null>(null);
const assignBrandIds = ref<string[]>([]);

const roleOptions = [
  { label: '超级管理员', value: 'SUPER_ADMIN' },
  { label: '管理员', value: 'ADMIN' },
  { label: '编辑', value: 'EDITOR' },
  { label: '品牌管理员', value: 'BRAND_MANAGER' },
];

async function load() {
  loading.value = true;
  const [userList, brandList] = await Promise.all([
    api.get<AdminUser[]>('/api/admin/users'),
    api.get<BrandOption[]>('/api/admin/brands'),
  ]);
  users.value = userList;
  brands.value = brandList;
  loading.value = false;
}

function openCreate() {
  createForm.value = { email: '', password: '', name: '', role: 'EDITOR' };
  createDialogVisible.value = true;
}

async function saveCreate() {
  if (!createForm.value.email || !createForm.value.password || !createForm.value.name) {
    ElMessage.error('请填写所有必填项');
    return;
  }
  try {
    await api.post('/api/admin/users', createForm.value);
    createDialogVisible.value = false;
    await load();
    ElMessage.success('管理员已创建');
  } catch (err: any) {
    ElMessage.error(err?.message || '创建管理员失败');
  }
}

function openAssignBrands(user: AdminUser) {
  assignUser.value = user;
  assignBrandIds.value = user.brandAssignments?.map((a) => a.brandId) ?? [];
  assignDialogVisible.value = true;
}

async function saveAssignments() {
  if (!assignUser.value) return;
  try {
    await api.put(`/api/admin/users/${assignUser.value.id}/brand-assignments`, {
      brandIds: assignBrandIds.value,
    });
    assignDialogVisible.value = false;
    await load();
    ElMessage.success('品牌权限已更新');
  } catch (err: any) {
    ElMessage.error(err?.message || '更新品牌权限失败');
  }
}

async function toggleActive(user: AdminUser) {
  try {
    await api.put(`/api/admin/users/${user.id}`, { isActive: !user.isActive });
    await load();
    ElMessage.success(user.isActive ? '用户已停用' : '用户已启用');
  } catch (err: any) {
    ElMessage.error(err?.message || '更新用户失败');
  }
}

function roleLabel(role: string) {
  return roleOptions.find((r) => r.value === role)?.label ?? role;
}

onMounted(load);
</script>

<template>
  <div>
    <AdminPageHeader title="管理员">
      <template #actions>
        <ElButton type="primary" @click="openCreate">+ 新建管理员</ElButton>
      </template>
    </AdminPageHeader>

    <!-- Create Dialog -->
    <ElDialog v-model="createDialogVisible" title="新建管理员" width="480px" destroy-on-close>
      <ElForm label-position="top" @submit.prevent="saveCreate">
        <ElFormItem label="名称" required>
          <ElInput v-model="createForm.name" />
        </ElFormItem>
        <ElFormItem label="邮箱" required>
          <ElInput v-model="createForm.email" type="email" />
        </ElFormItem>
        <ElFormItem label="密码" required>
          <ElInput v-model="createForm.password" type="password" show-password />
        </ElFormItem>
        <ElFormItem label="角色" required>
          <ElSelect v-model="createForm.role" style="width: 100%">
            <ElOption
              v-for="r in roleOptions"
              :key="r.value"
              :label="r.label"
              :value="r.value"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveCreate">创建</ElButton>
      </template>
    </ElDialog>

    <!-- Brand Assignment Dialog -->
    <ElDialog v-model="assignDialogVisible" title="分配品牌" width="480px" destroy-on-close>
      <p style="margin-bottom: 16px; color: #606266; font-size: 14px">
        选择 <strong>{{ assignUser?.name }}</strong> 可管理的品牌：
      </p>
      <ElCheckboxGroup v-model="assignBrandIds">
        <div v-for="b in brands" :key="b.id" style="margin-bottom: 8px">
          <ElCheckbox :value="b.id">{{ b.name }}</ElCheckbox>
        </div>
      </ElCheckboxGroup>
      <template #footer>
        <ElButton @click="assignDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveAssignments">保存</ElButton>
      </template>
    </ElDialog>

    <!-- Table -->
    <ElTable v-loading="loading" :data="users" stripe>
      <ElTableColumn prop="name" label="名称" min-width="120" />
      <ElTableColumn prop="email" label="邮箱" min-width="180" />
      <ElTableColumn label="角色" width="140">
        <template #default="{ row }">
          <ElTag
            :type="row.role === 'SUPER_ADMIN' ? 'danger' : row.role === 'ADMIN' ? 'warning' : row.role === 'BRAND_MANAGER' ? 'success' : 'info'"
            size="small"
            disable-transitions
          >
            {{ roleLabel(row.role) }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="品牌" min-width="160">
        <template #default="{ row }">
          <template v-if="row.role === 'BRAND_MANAGER' && row.brandAssignments?.length">
            <ElTag
              v-for="a in row.brandAssignments"
              :key="a.brandId"
              size="small"
              style="margin-right: 4px; margin-bottom: 2px"
            >
              {{ a.brand.name }}
            </ElTag>
          </template>
          <span v-else-if="row.role === 'BRAND_MANAGER'" style="color: #909399; font-size: 12px">未分配品牌</span>
          <span v-else style="color: #909399; font-size: 12px">全部</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="80">
        <template #default="{ row }">
          <ElTag :type="row.isActive ? 'success' : 'danger'" size="small" disable-transitions>
            {{ row.isActive ? '启用' : '停用' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="220" align="right">
        <template #default="{ row }">
          <ElButton
            v-if="row.role === 'BRAND_MANAGER'"
            size="small"
            @click="openAssignBrands(row)"
          >
            品牌
          </ElButton>
          <ElButton
            size="small"
            :type="row.isActive ? 'warning' : 'success'"
            :disabled="row.id === store.user?.id"
            @click="toggleActive(row)"
          >
            {{ row.isActive ? '停用' : '启用' }}
          </ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="暂无管理员" />
      </template>
    </ElTable>
  </div>
</template>
