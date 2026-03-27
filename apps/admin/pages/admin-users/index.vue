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
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Editor', value: 'EDITOR' },
  { label: 'Brand Manager', value: 'BRAND_MANAGER' },
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
    ElMessage.error('All fields are required');
    return;
  }
  try {
    await api.post('/api/admin/users', createForm.value);
    createDialogVisible.value = false;
    await load();
    ElMessage.success('Admin user created');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to create user');
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
    ElMessage.success('Brand assignments updated');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to update assignments');
  }
}

async function toggleActive(user: AdminUser) {
  try {
    await api.put(`/api/admin/users/${user.id}`, { isActive: !user.isActive });
    await load();
    ElMessage.success(user.isActive ? 'User deactivated' : 'User activated');
  } catch (err: any) {
    ElMessage.error(err?.message || 'Failed to update user');
  }
}

function roleLabel(role: string) {
  return roleOptions.find((r) => r.value === role)?.label ?? role;
}

onMounted(load);
</script>

<template>
  <div>
    <AdminPageHeader title="Admin Users">
      <template #actions>
        <ElButton type="primary" @click="openCreate">+ New User</ElButton>
      </template>
    </AdminPageHeader>

    <!-- Create Dialog -->
    <ElDialog v-model="createDialogVisible" title="New Admin User" width="480px" destroy-on-close>
      <ElForm label-position="top" @submit.prevent="saveCreate">
        <ElFormItem label="Name" required>
          <ElInput v-model="createForm.name" />
        </ElFormItem>
        <ElFormItem label="Email" required>
          <ElInput v-model="createForm.email" type="email" />
        </ElFormItem>
        <ElFormItem label="Password" required>
          <ElInput v-model="createForm.password" type="password" show-password />
        </ElFormItem>
        <ElFormItem label="Role" required>
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
        <ElButton @click="createDialogVisible = false">Cancel</ElButton>
        <ElButton type="primary" @click="saveCreate">Create</ElButton>
      </template>
    </ElDialog>

    <!-- Brand Assignment Dialog -->
    <ElDialog v-model="assignDialogVisible" title="Assign Brands" width="480px" destroy-on-close>
      <p style="margin-bottom: 16px; color: #606266; font-size: 14px">
        Select which brands <strong>{{ assignUser?.name }}</strong> can manage:
      </p>
      <ElCheckboxGroup v-model="assignBrandIds">
        <div v-for="b in brands" :key="b.id" style="margin-bottom: 8px">
          <ElCheckbox :value="b.id">{{ b.name }}</ElCheckbox>
        </div>
      </ElCheckboxGroup>
      <template #footer>
        <ElButton @click="assignDialogVisible = false">Cancel</ElButton>
        <ElButton type="primary" @click="saveAssignments">Save</ElButton>
      </template>
    </ElDialog>

    <!-- Table -->
    <ElTable v-loading="loading" :data="users" stripe>
      <ElTableColumn prop="name" label="Name" min-width="120" />
      <ElTableColumn prop="email" label="Email" min-width="180" />
      <ElTableColumn label="Role" width="140">
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
      <ElTableColumn label="Brands" min-width="160">
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
          <span v-else-if="row.role === 'BRAND_MANAGER'" style="color: #909399; font-size: 12px">No brands assigned</span>
          <span v-else style="color: #909399; font-size: 12px">All</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Status" width="80">
        <template #default="{ row }">
          <ElTag :type="row.isActive ? 'success' : 'danger'" size="small" disable-transitions>
            {{ row.isActive ? 'Active' : 'Inactive' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Actions" width="220" align="right">
        <template #default="{ row }">
          <ElButton
            v-if="row.role === 'BRAND_MANAGER'"
            size="small"
            @click="openAssignBrands(row)"
          >
            Brands
          </ElButton>
          <ElButton
            size="small"
            :type="row.isActive ? 'warning' : 'success'"
            :disabled="row.id === store.user?.id"
            @click="toggleActive(row)"
          >
            {{ row.isActive ? 'Deactivate' : 'Activate' }}
          </ElButton>
        </template>
      </ElTableColumn>
      <template #empty>
        <ElEmpty description="No admin users" />
      </template>
    </ElTable>
  </div>
</template>
