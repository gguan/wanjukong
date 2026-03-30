<script setup lang="ts">
const { user, email, logout } = useAdminAuth();

const searchQuery = ref('');

const initials = computed(() => {
  const name = user.value?.name || email.value || '';
  return name.slice(0, 1).toUpperCase();
});

const displayName = computed(() => user.value?.name || email.value || '');
</script>

<template>
  <ElHeader class="admin-header">
    <!-- Left: Logo -->
    <NuxtLink to="/" class="admin-header__logo">
      <svg class="admin-header__logo-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M6 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.414A2 2 0 0 0 15.414 6L12 2.586A2 2 0 0 0 10.586 2H6Z" />
      </svg>
      <span>wanjukong</span>
    </NuxtLink>

    <!-- Center: Search -->
    <div class="admin-header__search">
      <ElInput
        v-model="searchQuery"
        placeholder="搜索商品、订单..."
        size="small"
        class="admin-header__search-input"
        clearable
      >
        <template #prefix>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="opacity: 0.6">
            <path fill-rule="evenodd" d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2 8a6 6 0 1 1 10.89 3.476l4.817 4.817a1 1 0 0 1-1.414 1.414l-4.816-4.816A6 6 0 0 1 2 8Z" clip-rule="evenodd" />
          </svg>
        </template>
      </ElInput>
    </div>

    <!-- Right: Profile -->
    <div class="admin-header__right">
      <ElDropdown trigger="click" @command="(cmd: string) => cmd === 'logout' && logout()">
        <button class="admin-header__profile">
          <span class="admin-header__avatar">{{ initials }}</span>
          <span class="admin-header__name">{{ displayName }}</span>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style="opacity: 0.5">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" />
          </svg>
        </button>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem disabled>
              <span style="font-size: 12px; color: #8c9196">{{ email }}</span>
            </ElDropdownItem>
            <ElDropdownItem divided command="logout">
              退出登录
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
    </div>
  </ElHeader>
</template>

<style scoped>
.admin-header {
  background: var(--wk-admin-header-bg, #1a1a1a);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  border-bottom: none;
  gap: 16px;
}

/* Logo */
.admin-header__logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #fff;
  text-decoration: none;
  flex-shrink: 0;
}

.admin-header__logo-icon {
  opacity: 0.7;
}

/* Search */
.admin-header__search {
  flex: 1;
  max-width: 480px;
  margin: 0 auto;
}

.admin-header__search :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1) !important;
  box-shadow: none !important;
  border-radius: 8px !important;
  color: #fff;
  transition: background 0.15s;
}

.admin-header__search :deep(.el-input__wrapper:hover) {
  background: rgba(255, 255, 255, 0.15) !important;
}

.admin-header__search :deep(.el-input__wrapper.is-focus) {
  background: rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2) !important;
}

.admin-header__search :deep(.el-input__inner) {
  color: #fff;
  font-size: 13px;
}

.admin-header__search :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.5);
}

/* Right */
.admin-header__right {
  flex-shrink: 0;
}

.admin-header__profile {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
  font-family: inherit;
  font-size: 13px;
}

.admin-header__profile:hover {
  background: rgba(255, 255, 255, 0.1);
}

.admin-header__avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #008060;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.admin-header__name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .admin-header__search { display: none; }
  .admin-header__name { display: none; }
}
</style>
